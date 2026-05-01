const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovernanceMultiSig", function() {
  let governanceMultiSig, identityRegistry, circuitBreaker;
  let commander, auditor, procurementCommand, targetSoldier, stranger;

  beforeEach(async function() {
    [commander, auditor, procurementCommand, targetSoldier, stranger] = await ethers.getSigners();

    const GovernanceMultiSig = await ethers.getContractFactory("GovernanceMultiSig");
    governanceMultiSig = await GovernanceMultiSig.deploy(
      commander.address, auditor.address, procurementCommand.address
    );
    await governanceMultiSig.waitForDeployment();

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistry.deploy(await governanceMultiSig.getAddress());
    await identityRegistry.waitForDeployment();

    const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
    circuitBreaker = await CircuitBreaker.deploy(await governanceMultiSig.getAddress());
    await circuitBreaker.waitForDeployment();

    await governanceMultiSig.setContracts(
      await identityRegistry.getAddress(),
      await circuitBreaker.getAddress()
    );
  });

  it("proposal created successfully by member", async function() {
    const tx = await governanceMultiSig.connect(commander).proposeAction(
      0, targetSoldier.address, 3, 2, "did:example:test", ""
    );
    await tx.wait();
    const count = await governanceMultiSig.proposalCount();
    expect(count).to.equal(1n);
  });

  it("non-member cannot create proposal", async function() {
    await expect(
      governanceMultiSig.connect(stranger).proposeAction(
        0, targetSoldier.address, 3, 2, "did:test", ""
      )
    ).to.be.revertedWith("GovernanceMultiSig: not a member");
  });

  it("single vote does not execute action", async function() {
    await governanceMultiSig.connect(commander).proposeAction(
      0, targetSoldier.address, 3, 2, "did:example:test", ""
    );
    expect(await identityRegistry.isActive(targetSoldier.address)).to.equal(false);
  });

  it("two of three votes executes action", async function() {
    const tx1 = await governanceMultiSig.connect(commander).proposeAction(
      0, targetSoldier.address, 3, 2, "did:example:test", ""
    );
    await tx1.wait();
    const proposalId = (await governanceMultiSig.proposalCount()) - 1n;

    await governanceMultiSig.connect(auditor).vote(proposalId);
    expect(await identityRegistry.isActive(targetSoldier.address)).to.equal(true);
  });

  it("same member cannot vote twice", async function() {
    const tx1 = await governanceMultiSig.connect(commander).proposeAction(
      0, targetSoldier.address, 3, 2, "did:example:test", ""
    );
    await tx1.wait();
    const proposalId = (await governanceMultiSig.proposalCount()) - 1n;

    await expect(
      governanceMultiSig.connect(commander).vote(proposalId)
    ).to.be.revertedWith("GovernanceMultiSig: already voted");
  });

  it("revoked proposal cannot be voted on", async function() {
    const tx1 = await governanceMultiSig.connect(commander).proposeAction(
      0, targetSoldier.address, 3, 2, "did:example:test", ""
    );
    await tx1.wait();
    const proposalId = (await governanceMultiSig.proposalCount()) - 1n;

    await governanceMultiSig.connect(commander).revokeProposal(proposalId);

    await expect(
      governanceMultiSig.connect(auditor).vote(proposalId)
    ).to.be.revertedWith("GovernanceMultiSig: proposal not pending");
  });

  it("only proposer can revoke proposal", async function() {
    const tx1 = await governanceMultiSig.connect(commander).proposeAction(
      0, targetSoldier.address, 3, 2, "did:example:test", ""
    );
    await tx1.wait();
    const proposalId = (await governanceMultiSig.proposalCount()) - 1n;

    await expect(
      governanceMultiSig.connect(auditor).revokeProposal(proposalId)
    ).to.be.revertedWith("GovernanceMultiSig: not proposer");
  });

  it("executed action registers soldier in IdentityRegistry", async function() {
    const tx1 = await governanceMultiSig.connect(commander).proposeAction(
      0, targetSoldier.address, 3, 2, "did:example:soldier", ""
    );
    await tx1.wait();
    const proposalId = (await governanceMultiSig.proposalCount()) - 1n;
    await governanceMultiSig.connect(auditor).vote(proposalId);

    expect(await identityRegistry.isActive(targetSoldier.address)).to.equal(true);
    expect(await identityRegistry.getClearance(targetSoldier.address)).to.equal(3);
  });

  it("pause action triggers circuit breaker", async function() {
    const tx1 = await governanceMultiSig.connect(commander).proposeAction(
      3, ethers.ZeroAddress, 0, 0, "", ""
    );
    await tx1.wait();
    const proposalId = (await governanceMultiSig.proposalCount()) - 1n;
    await governanceMultiSig.connect(auditor).vote(proposalId);

    expect(await circuitBreaker.isPaused()).to.equal(true);
  });

  it("unpause action restores circuit breaker", async function() {
    const pauseTx = await governanceMultiSig.connect(commander).proposeAction(
      3, ethers.ZeroAddress, 0, 0, "", ""
    );
    await pauseTx.wait();
    const pauseId = (await governanceMultiSig.proposalCount()) - 1n;
    await governanceMultiSig.connect(auditor).vote(pauseId);
    expect(await circuitBreaker.isPaused()).to.equal(true);

    const unpauseTx = await governanceMultiSig.connect(commander).proposeAction(
      4, ethers.ZeroAddress, 0, 0, "", ""
    );
    await unpauseTx.wait();
    const unpauseId = (await governanceMultiSig.proposalCount()) - 1n;
    await governanceMultiSig.connect(auditor).vote(unpauseId);
    expect(await circuitBreaker.isPaused()).to.equal(false);
  });

  it("emits ProposalCreated and VoteCast events", async function() {
    await expect(
      governanceMultiSig.connect(commander).proposeAction(
        0, targetSoldier.address, 3, 2, "did:example:test", ""
      )
    ).to.emit(governanceMultiSig, "ProposalCreated")
      .and.to.emit(governanceMultiSig, "VoteCast");
  });

  it("emits ProposalExecuted event on execution", async function() {
    const tx1 = await governanceMultiSig.connect(commander).proposeAction(
      0, targetSoldier.address, 3, 2, "did:example:test", ""
    );
    await tx1.wait();
    const proposalId = (await governanceMultiSig.proposalCount()) - 1n;

    await expect(
      governanceMultiSig.connect(auditor).vote(proposalId)
    ).to.emit(governanceMultiSig, "ProposalExecuted");
  });

  it("isCommander returns true for commander role", async function() {
    expect(await governanceMultiSig.isCommander(commander.address)).to.equal(true);
    expect(await governanceMultiSig.isCommander(auditor.address)).to.equal(false);
    expect(await governanceMultiSig.isCommander(stranger.address)).to.equal(false);
  });
});
