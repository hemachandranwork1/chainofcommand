const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuditLog", function() {
  let auditLog, procurementGate, stranger, owner;

  beforeEach(async function() {
    [owner, procurementGate, stranger] = await ethers.getSigners();

    const AuditLog = await ethers.getContractFactory("AuditLog");
    auditLog = await AuditLog.deploy(procurementGate.address);
    await auditLog.waitForDeployment();
  });

  async function addEntry(signer, eventType, actor, componentId, outcome, denialReason, anomalies) {
    return auditLog.connect(signer).addEntry(
      eventType,
      actor,
      componentId,
      outcome,
      denialReason,
      anomalies,
      ethers.keccak256(ethers.toUtf8Bytes("location"))
    );
  }

  it("entry successfully appended by ProcurementGate", async function() {
    const compId = ethers.keccak256(ethers.toUtf8Bytes("COMP-001"));
    await addEntry(
      procurementGate,
      "PROCUREMENT_APPROVED",
      owner.address,
      compId,
      "APPROVED",
      "",
      []
    );
    expect(await auditLog.entryCount()).to.equal(1n);
  });

  it("entry cannot be written by non-ProcurementGate address", async function() {
    const compId = ethers.keccak256(ethers.toUtf8Bytes("COMP-002"));
    await expect(
      addEntry(stranger, "PROCUREMENT_APPROVED", owner.address, compId, "APPROVED", "", [])
    ).to.be.revertedWith("AuditLog: caller is not ProcurementGate");
  });

  it("entry cannot be written by owner if not ProcurementGate", async function() {
    const compId = ethers.keccak256(ethers.toUtf8Bytes("COMP-003"));
    await expect(
      addEntry(owner, "PROCUREMENT_APPROVED", owner.address, compId, "APPROVED", "", [])
    ).to.be.revertedWith("AuditLog: caller is not ProcurementGate");
  });

  it("no delete function exists on contract", async function() {
    expect(auditLog.deleteEntry).to.be.undefined;
    expect(auditLog.removeEntry).to.be.undefined;
    expect(auditLog.clearEntry).to.be.undefined;
  });

  it("no modify function exists on contract", async function() {
    expect(auditLog.modifyEntry).to.be.undefined;
    expect(auditLog.updateEntry).to.be.undefined;
    expect(auditLog.editEntry).to.be.undefined;
  });

  it("root hash stored and retrievable by index", async function() {
    const compId = ethers.keccak256(ethers.toUtf8Bytes("COMP-HASH"));
    await addEntry(procurementGate, "PROCUREMENT_DENIED", owner.address, compId, "DENIED", "LOW_CLEARANCE", []);
    const rootHash = await auditLog.getRootHash(0);
    expect(rootHash).to.not.equal(ethers.ZeroHash);
  });

  it("root hash is deterministic and matches event data", async function() {
    const compId = ethers.keccak256(ethers.toUtf8Bytes("COMP-VERIFY"));
    const locationHash = ethers.keccak256(ethers.toUtf8Bytes("location"));

    const tx = await auditLog.connect(procurementGate).addEntry(
      "PROCUREMENT_APPROVED",
      owner.address,
      compId,
      "APPROVED",
      "",
      [],
      locationHash
    );
    const receipt = await tx.wait();

    const block = await ethers.provider.getBlock(receipt.blockNumber);

    const isValid = await auditLog.verifyEntry(
      0,
      "PROCUREMENT_APPROVED",
      owner.address,
      compId,
      block.timestamp,
      BigInt(receipt.blockNumber),
      "APPROVED",
      "",
      locationHash
    );
    expect(isValid).to.equal(true);
  });

  it("verification fails with tampered data", async function() {
    const compId = ethers.keccak256(ethers.toUtf8Bytes("COMP-TAMPER"));
    const locationHash = ethers.keccak256(ethers.toUtf8Bytes("location"));

    const tx = await auditLog.connect(procurementGate).addEntry(
      "PROCUREMENT_APPROVED",
      owner.address,
      compId,
      "APPROVED",
      "",
      [],
      locationHash
    );
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);

    const isValid = await auditLog.verifyEntry(
      0,
      "PROCUREMENT_DENIED",
      owner.address,
      compId,
      block.timestamp,
      BigInt(receipt.blockNumber),
      "DENIED",
      "tampered",
      locationHash
    );
    expect(isValid).to.equal(false);
  });

  it("all anomaly flags stored in event", async function() {
    const compId = ethers.keccak256(ethers.toUtf8Bytes("COMP-ANOMALY"));
    const anomalies = ["CLEARANCE_VIOLATION", "TIME_ANOMALY", "RATE_LIMIT"];

    await expect(
      addEntry(procurementGate, "PROCUREMENT_DENIED", owner.address, compId, "DENIED", "MULTI", anomalies)
    ).to.emit(auditLog, "LogEntryAdded");
  });

  it("entryCount increments correctly", async function() {
    const compId = ethers.keccak256(ethers.toUtf8Bytes("COMP-COUNT"));
    expect(await auditLog.entryCount()).to.equal(0n);

    await addEntry(procurementGate, "PROCUREMENT_APPROVED", owner.address, compId, "APPROVED", "", []);
    expect(await auditLog.entryCount()).to.equal(1n);

    await addEntry(procurementGate, "PROCUREMENT_DENIED", owner.address, compId, "DENIED", "reason", []);
    expect(await auditLog.entryCount()).to.equal(2n);
  });

  it("getRootHash reverts for out of bounds index", async function() {
    await expect(auditLog.getRootHash(999n)).to.be.revertedWith("AuditLog: index out of bounds");
  });

  it("emits LogEntryAdded event with correct fields", async function() {
    const compId = ethers.keccak256(ethers.toUtf8Bytes("COMP-EVENT"));
    const locationHash = ethers.keccak256(ethers.toUtf8Bytes("location"));

    await expect(
      auditLog.connect(procurementGate).addEntry(
        "PROCUREMENT_APPROVED", owner.address, compId, "APPROVED", "", [], locationHash
      )
    ).to.emit(auditLog, "LogEntryAdded")
      .withArgs(
        0n,
        "PROCUREMENT_APPROVED",
        owner.address,
        compId,
        ethers.isHexString,
        ethers.isHexString,
        "APPROVED",
        "",
        [],
        locationHash,
        ethers.isHexString
      );
  });
});
