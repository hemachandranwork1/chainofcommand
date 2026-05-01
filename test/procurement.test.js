const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProcurementGate", function() {
  let identityRegistry, componentRegistry, auditLog, circuitBreaker, procurementGate, governanceMultiSig;
  let commander, auditor, procurementCommand, officer, secondOfficer, manufacturer, vendor, base, stranger;

  const VALID_DEVICE_TOKEN = "DEVICE-TOKEN-VALID-001";
  const COMPROMISED_TOKEN = "DEVICE-TOKEN-COMPROMISED-001";

  beforeEach(async function() {
    [commander, auditor, procurementCommand, officer, secondOfficer, manufacturer, vendor, base, stranger] =
      await ethers.getSigners();

    const GovernanceMultiSig = await ethers.getContractFactory("GovernanceMultiSig");
    governanceMultiSig = await GovernanceMultiSig.deploy(
      commander.address, auditor.address, procurementCommand.address
    );
    await governanceMultiSig.waitForDeployment();

    const AuditLog = await ethers.getContractFactory("AuditLog");
    auditLog = await AuditLog.deploy(ethers.ZeroAddress);
    await auditLog.waitForDeployment();

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistry.deploy(await governanceMultiSig.getAddress());
    await identityRegistry.waitForDeployment();

    const ComponentRegistry = await ethers.getContractFactory("ComponentRegistry");
    componentRegistry = await ComponentRegistry.deploy();
    await componentRegistry.waitForDeployment();

    const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
    circuitBreaker = await CircuitBreaker.deploy(await governanceMultiSig.getAddress());
    await circuitBreaker.waitForDeployment();

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

    await procurementGate.flagDeviceToken(COMPROMISED_TOKEN);
  });

  async function registerOfficer(wallet, clearance) {
    const tx1 = await governanceMultiSig.connect(commander).proposeAction(
      0, wallet, clearance, 2, "did:example:officer", ""
    );
    await tx1.wait();
    const proposalId = (await governanceMultiSig.proposalCount()) - 1n;
    await governanceMultiSig.connect(auditor).vote(proposalId);
  }

  async function registerComponent(clearanceCategory, value, verified = true) {
    const compId = ethers.keccak256(ethers.toUtf8Bytes("COMP-" + Date.now() + Math.random()));
    await componentRegistry.connect(manufacturer).registerComponent(
      compId, "Test Component", clearanceCategory, value,
      ethers.keccak256(ethers.toUtf8Bytes("puf")), "cid"
    );
    await componentRegistry.connect(manufacturer).transferOwnership(
      compId, vendor.address,
      ethers.keccak256(ethers.toUtf8Bytes("factory")), true
    );
    await componentRegistry.connect(vendor).transferOwnership(
      compId, base.address,
      ethers.keccak256(ethers.toUtf8Bytes("base")), verified
    );
    return compId;
  }

  it("grants approval when all three layers pass", async function() {
    await registerOfficer(officer.address, 3);
    const compId = await registerComponent(3, ethers.parseEther("5"));

    await expect(
      procurementGate.connect(officer).approveProcurement(
        officer.address, compId, VALID_DEVICE_TOKEN,
        ethers.keccak256(ethers.toUtf8Bytes("base-location"))
      )
    ).to.emit(procurementGate, "ApprovalGranted");
  });

  it("rejects when clearance too low", async function() {
    await registerOfficer(officer.address, 2);
    const compId = await registerComponent(4, ethers.parseEther("5"));

    await expect(
      procurementGate.connect(officer).approveProcurement(
        officer.address, compId, VALID_DEVICE_TOKEN,
        ethers.keccak256(ethers.toUtf8Bytes("base-location"))
      )
    ).to.emit(procurementGate, "ApprovalDenied");
  });

  it("rejects when component has transfer gap", async function() {
    await registerOfficer(officer.address, 3);
    const compId = await registerComponent(3, ethers.parseEther("5"), false);

    await expect(
      procurementGate.connect(officer).approveProcurement(
        officer.address, compId, VALID_DEVICE_TOKEN,
        ethers.keccak256(ethers.toUtf8Bytes("base-location"))
      )
    ).to.emit(procurementGate, "ApprovalDenied");
  });

  it("rejects when device token is flagged as compromised", async function() {
    await registerOfficer(officer.address, 3);
    const compId = await registerComponent(3, ethers.parseEther("5"));

    await expect(
      procurementGate.connect(officer).approveProcurement(
        officer.address, compId, COMPROMISED_TOKEN,
        ethers.keccak256(ethers.toUtf8Bytes("base-location"))
      )
    ).to.emit(procurementGate, "ApprovalDenied");
  });

  it("rejects when circuit breaker is paused", async function() {
    await registerOfficer(officer.address, 3);
    const compId = await registerComponent(3, ethers.parseEther("5"));

    const pauseTx = await governanceMultiSig.connect(commander).proposeAction(
      3, ethers.ZeroAddress, 0, 0, "", ""
    );
    await pauseTx.wait();
    const proposalId = (await governanceMultiSig.proposalCount()) - 1n;
    await governanceMultiSig.connect(auditor).vote(proposalId);

    await expect(
      procurementGate.connect(officer).approveProcurement(
        officer.address, compId, VALID_DEVICE_TOKEN,
        ethers.keccak256(ethers.toUtf8Bytes("base-location"))
      )
    ).to.emit(procurementGate, "ApprovalDenied");
  });

  it("rejects when rate limit exceeded", async function() {
    await registerOfficer(officer.address, 3);
    const locationHash = ethers.keccak256(ethers.toUtf8Bytes("base-location"));

    for (let i = 0; i < 10; i++) {
      const compId = await registerComponent(3, ethers.parseEther("1"));
      await procurementGate.connect(officer).approveProcurement(
        officer.address, compId, VALID_DEVICE_TOKEN, locationHash
      );
    }

    const extraComp = await registerComponent(3, ethers.parseEther("1"));
    await expect(
      procurementGate.connect(officer).approveProcurement(
        officer.address, extraComp, VALID_DEVICE_TOKEN, locationHash
      )
    ).to.emit(procurementGate, "ApprovalDenied");
  });

  it("high value component requires second signature", async function() {
    await registerOfficer(officer.address, 3);
    const highValueComp = await registerComponent(3, ethers.parseEther("200"));
    const locationHash = ethers.keccak256(ethers.toUtf8Bytes("base-location"));

    await expect(
      procurementGate.connect(officer).approveProcurement(
        officer.address, highValueComp, VALID_DEVICE_TOKEN, locationHash
      )
    ).to.emit(procurementGate, "ApprovalDenied");

    await procurementGate.connect(officer).submitSecondSignature(highValueComp);

    await expect(
      procurementGate.connect(officer).approveProcurement(
        officer.address, highValueComp, VALID_DEVICE_TOKEN, locationHash
      )
    ).to.emit(procurementGate, "ApprovalGranted");
  });

  it("audit log entry created for successful approval", async function() {
    await registerOfficer(officer.address, 3);
    const compId = await registerComponent(3, ethers.parseEther("5"));

    await procurementGate.connect(officer).approveProcurement(
      officer.address, compId, VALID_DEVICE_TOKEN,
      ethers.keccak256(ethers.toUtf8Bytes("base-location"))
    );

    const entryCount = await auditLog.entryCount();
    expect(entryCount).to.be.greaterThan(0n);
  });

  it("audit log entry created for failed approval", async function() {
    await registerOfficer(officer.address, 2);
    const compId = await registerComponent(4, ethers.parseEther("5"));

    await procurementGate.connect(officer).approveProcurement(
      officer.address, compId, VALID_DEVICE_TOKEN,
      ethers.keccak256(ethers.toUtf8Bytes("base-location"))
    );

    const entryCount = await auditLog.entryCount();
    expect(entryCount).to.be.greaterThan(0n);
  });

  it("rejects when officer is not active", async function() {
    const compId = await registerComponent(3, ethers.parseEther("5"));

    await expect(
      procurementGate.connect(stranger).approveProcurement(
        stranger.address, compId, VALID_DEVICE_TOKEN,
        ethers.keccak256(ethers.toUtf8Bytes("base-location"))
      )
    ).to.emit(procurementGate, "ApprovalDenied");
  });
});
