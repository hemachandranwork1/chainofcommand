const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CircuitBreaker", function() {
  let circuitBreaker, governanceMultiSig, procurementGate, identityRegistry, componentRegistry, auditLog;
  let commander, auditor, procurementCommand, officer, manufacturer, stranger;

  beforeEach(async function() {
    [commander, auditor, procurementCommand, officer, manufacturer, stranger] = await ethers.getSigners();

    const GovernanceMultiSig = await ethers.getContractFactory("GovernanceMultiSig");
    governanceMultiSig = await GovernanceMultiSig.deploy(
      commander.address, auditor.address, procurementCommand.address
    );
    await governanceMultiSig.waitForDeployment();

    const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
    circuitBreaker = await CircuitBreaker.deploy(await governanceMultiSig.getAddress());
    await circuitBreaker.waitForDeployment();

    const AuditLog = await ethers.getContractFactory("AuditLog");
    auditLog = await AuditLog.deploy(ethers.ZeroAddress);
    await auditLog.waitForDeployment();

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistry.deploy(await governanceMultiSig.getAddress());
    await identityRegistry.waitForDeployment();

    const ComponentRegistry = await ethers.getContractFactory("ComponentRegistry");
    componentRegistry = await ComponentRegistry.deploy();
    await componentRegistry.waitForDeployment();

    const ProcurementGate = await ethers.getContractFactory("ProcurementGate");
    procurementGate = await ProcurementGate.deploy(
      await identityRegistry.getAddress(),
      await componentRegistry.getAddress(),
      await auditLog.getAddress(),
      await circuitBreaker.getAddress()
    );
    await procurementGate.waitForDeployment();

    await auditLog.setProcurementGate(await procurementGate.getAddress());
    await governanceMultiSig.setContracts(
      await identityRegistry.getAddress(),
      await circuitBreaker.getAddress()
    );
  });

  async function pauseSystem() {
    const tx = await governanceMultiSig.connect(commander).proposeAction(
      3, ethers.ZeroAddress, 0, 0, "", ""
    );
    await tx.wait();
    const id = (await governanceMultiSig.proposalCount()) - 1n;
    await governanceMultiSig.connect(auditor).vote(id);
  }

  async function unpauseSystem() {
    const tx = await governanceMultiSig.connect(commander).proposeAction(
      4, ethers.ZeroAddress, 0, 0, "", ""
    );
    await tx.wait();
    const id = (await governanceMultiSig.proposalCount()) - 1n;
    await governanceMultiSig.connect(auditor).vote(id);
  }

  it("only GovernanceMultiSig can pause", async function() {
    await expect(
      circuitBreaker.connect(stranger).pause()
    ).to.be.revertedWith("CircuitBreaker: caller is not governance");

    await expect(
      circuitBreaker.connect(commander).pause()
    ).to.be.revertedWith("CircuitBreaker: caller is not governance");
  });

  it("only GovernanceMultiSig can unpause", async function() {
    await pauseSystem();
    await expect(
      circuitBreaker.connect(stranger).unpause()
    ).to.be.revertedWith("CircuitBreaker: caller is not governance");
  });

  it("isPaused returns false initially", async function() {
    expect(await circuitBreaker.isPaused()).to.equal(false);
  });

  it("isPaused returns true after pause", async function() {
    await pauseSystem();
    expect(await circuitBreaker.isPaused()).to.equal(true);
  });

  it("isPaused returns false after unpause", async function() {
    await pauseSystem();
    await unpauseSystem();
    expect(await circuitBreaker.isPaused()).to.equal(false);
  });

  it("cannot pause when already paused", async function() {
    await pauseSystem();
    const tx = await governanceMultiSig.connect(commander).proposeAction(
      3, ethers.ZeroAddress, 0, 0, "", ""
    );
    await tx.wait();
    const id = (await governanceMultiSig.proposalCount()) - 1n;
    await expect(
      governanceMultiSig.connect(auditor).vote(id)
    ).to.be.reverted;
  });

  it("cannot unpause when not paused", async function() {
    const tx = await governanceMultiSig.connect(commander).proposeAction(
      4, ethers.ZeroAddress, 0, 0, "", ""
    );
    await tx.wait();
    const id = (await governanceMultiSig.proposalCount()) - 1n;
    await expect(
      governanceMultiSig.connect(auditor).vote(id)
    ).to.be.reverted;
  });

  it("ProcurementGate emits ApprovalDenied when paused", async function() {
    await pauseSystem();

    const compId = ethers.keccak256(ethers.toUtf8Bytes("COMP-PAUSED"));
    await expect(
      procurementGate.connect(officer).approveProcurement(
        officer.address,
        compId,
        "VALID-TOKEN",
        ethers.keccak256(ethers.toUtf8Bytes("location"))
      )
    ).to.emit(procurementGate, "ApprovalDenied");
  });

  it("pause event emitted correctly", async function() {
    const tx = await governanceMultiSig.connect(commander).proposeAction(
      3, ethers.ZeroAddress, 0, 0, "", ""
    );
    await tx.wait();
    const id = (await governanceMultiSig.proposalCount()) - 1n;

    await expect(
      governanceMultiSig.connect(auditor).vote(id)
    ).to.emit(circuitBreaker, "SystemPaused");
  });

  it("unpause event emitted correctly", async function() {
    await pauseSystem();

    const tx = await governanceMultiSig.connect(commander).proposeAction(
      4, ethers.ZeroAddress, 0, 0, "", ""
    );
    await tx.wait();
    const id = (await governanceMultiSig.proposalCount()) - 1n;

    await expect(
      governanceMultiSig.connect(auditor).vote(id)
    ).to.emit(circuitBreaker, "SystemUnpaused");
  });
});
