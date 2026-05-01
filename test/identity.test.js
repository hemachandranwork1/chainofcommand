const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdentityRegistry", function() {
  let identityRegistry;
  let governanceMultiSig;
  let commander, auditor, procurementCommand, soldier1, soldier2, stranger;

  beforeEach(async function() {
    [commander, auditor, procurementCommand, soldier1, soldier2, stranger] = await ethers.getSigners();

    const GovernanceMultiSig = await ethers.getContractFactory("GovernanceMultiSig");
    governanceMultiSig = await GovernanceMultiSig.deploy(
      commander.address,
      auditor.address,
      procurementCommand.address
    );
    await governanceMultiSig.waitForDeployment();

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistry.deploy(await governanceMultiSig.getAddress());
    await identityRegistry.waitForDeployment();

    await governanceMultiSig.setContracts(
      await identityRegistry.getAddress(),
      ethers.ZeroAddress
    );
  });

  async function registerViaMutisig(wallet, rank, clearance, did) {
    const tx1 = await governanceMultiSig.connect(commander).proposeAction(
      0, wallet, clearance, rank, did, ""
    );
    await tx1.wait();
    const proposalId = (await governanceMultiSig.proposalCount()) - 1n;
    const tx2 = await governanceMultiSig.connect(auditor).vote(proposalId);
    await tx2.wait();
    return proposalId;
  }

  it("successfully registers soldier with governance multisig approval", async function() {
    await registerViaMutisig(soldier1.address, 2, 3, "did:example:soldier1");
    expect(await identityRegistry.isActive(soldier1.address)).to.equal(true);
    expect(await identityRegistry.getClearance(soldier1.address)).to.equal(3);
  });

  it("fails registration without multisig quorum", async function() {
    await expect(
      identityRegistry.connect(stranger).registerSoldier(
        soldier1.address, 2, 3, "did:example:soldier1"
      )
    ).to.be.revertedWith("IdentityRegistry: caller is not governance");
  });

  it("fails registration with only one governance vote", async function() {
    const tx = await governanceMultiSig.connect(commander).proposeAction(
      0, soldier1.address, 3, 2, "did:example:soldier1", ""
    );
    await tx.wait();
    expect(await identityRegistry.isActive(soldier1.address)).to.equal(false);
  });

  it("stores and retrieves clearance level correctly", async function() {
    await registerViaMutisig(soldier1.address, 2, 4, "did:example:soldier1");
    const clearance = await identityRegistry.getClearance(soldier1.address);
    expect(clearance).to.equal(4);
  });

  it("revocation marks address inactive", async function() {
    await registerViaMutisig(soldier1.address, 2, 3, "did:example:soldier1");
    expect(await identityRegistry.isActive(soldier1.address)).to.equal(true);

    const tx1 = await governanceMultiSig.connect(commander).proposeAction(
      1, soldier1.address, 0, 0, "", "security breach"
    );
    await tx1.wait();
    const proposalId = (await governanceMultiSig.proposalCount()) - 1n;
    await governanceMultiSig.connect(auditor).vote(proposalId);

    expect(await identityRegistry.isActive(soldier1.address)).to.equal(false);
  });

  it("isActive returns false after revocation", async function() {
    await registerViaMutisig(soldier1.address, 2, 3, "did:example:soldier1");
    const tx1 = await governanceMultiSig.connect(commander).proposeAction(
      1, soldier1.address, 0, 0, "", "revoked"
    );
    await tx1.wait();
    const proposalId = (await governanceMultiSig.proposalCount()) - 1n;
    await governanceMultiSig.connect(auditor).vote(proposalId);
    expect(await identityRegistry.isActive(soldier1.address)).to.equal(false);
  });

  it("isActive returns false for unregistered address", async function() {
    expect(await identityRegistry.isActive(stranger.address)).to.equal(false);
  });

  it("clearance update requires multisig", async function() {
    await registerViaMutisig(soldier1.address, 2, 2, "did:example:soldier1");
    expect(await identityRegistry.getClearance(soldier1.address)).to.equal(2);

    const tx1 = await governanceMultiSig.connect(commander).proposeAction(
      2, soldier1.address, 4, 0, "", ""
    );
    await tx1.wait();
    const proposalId = (await governanceMultiSig.proposalCount()) - 1n;
    await governanceMultiSig.connect(auditor).vote(proposalId);

    expect(await identityRegistry.getClearance(soldier1.address)).to.equal(4);
  });

  it("clearance update fails without multisig", async function() {
    await registerViaMutisig(soldier1.address, 2, 2, "did:example:soldier1");
    await expect(
      identityRegistry.connect(stranger).updateClearance(soldier1.address, 5)
    ).to.be.revertedWith("IdentityRegistry: caller is not governance");
  });

  it("emergency revocation by commander quorum", async function() {
    await registerViaMutisig(soldier1.address, 2, 3, "did:example:soldier1");
    await registerViaMutisig(commander.address, 3, 5, "did:example:commander");
    await registerViaMutisig(auditor.address, 3, 5, "did:example:commander2");

    await identityRegistry.connect(stranger).emergencyRevoke(
      soldier1.address,
      commander.address,
      auditor.address
    );
    expect(await identityRegistry.isActive(soldier1.address)).to.equal(false);
  });

  it("emergency revocation fails with same commander twice", async function() {
    await registerViaMutisig(soldier1.address, 2, 3, "did:example:soldier1");
    await expect(
      identityRegistry.connect(stranger).emergencyRevoke(
        soldier1.address,
        commander.address,
        commander.address
      )
    ).to.be.revertedWith("IdentityRegistry: same commander");
  });

  it("getClearance reverts for unregistered soldier", async function() {
    await expect(
      identityRegistry.getClearance(stranger.address)
    ).to.be.revertedWith("IdentityRegistry: soldier not found");
  });

  it("getSoldier returns correct data", async function() {
    await registerViaMutisig(soldier1.address, 2, 3, "did:example:soldier1");
    const data = await identityRegistry.getSoldier(soldier1.address);
    expect(data.clearanceLevel).to.equal(3);
    expect(data.active).to.equal(true);
    expect(data.didReference).to.equal("did:example:soldier1");
  });
});
