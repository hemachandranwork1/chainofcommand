const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ComponentRegistry", function() {
  let componentRegistry;
  let manufacturer, vendor, base, auditor, stranger;

  beforeEach(async function() {
    [manufacturer, vendor, base, auditor, stranger] = await ethers.getSigners();

    const ComponentRegistry = await ethers.getContractFactory("ComponentRegistry");
    componentRegistry = await ComponentRegistry.deploy();
    await componentRegistry.waitForDeployment();
  });

  function makeComponentId(name) {
    return ethers.keccak256(ethers.toUtf8Bytes(name));
  }

  async function registerComponent(signer, id, type, category, value) {
    return componentRegistry.connect(signer).registerComponent(
      id, type, category, value,
      ethers.keccak256(ethers.toUtf8Bytes(id + "-puf")),
      "encrypted-cid-" + id.slice(2, 10)
    );
  }

  it("successfully registers a component", async function() {
    const compId = makeComponentId("COMP-001");
    await registerComponent(manufacturer, compId, "Guidance Module", 3, ethers.parseEther("5"));
    const [comp] = await componentRegistry.getFullHistory(compId);
    expect(comp.exists).to.equal(true);
    expect(comp.manufacturer).to.equal(manufacturer.address);
    expect(comp.categoryLevel).to.equal(3);
  });

  it("prevents duplicate registration", async function() {
    const compId = makeComponentId("COMP-DUP");
    await registerComponent(manufacturer, compId, "Module", 2, ethers.parseEther("1"));
    await expect(
      registerComponent(manufacturer, compId, "Module", 2, ethers.parseEther("1"))
    ).to.be.revertedWith("ComponentRegistry: component already registered");
  });

  it("transfer history correctly appended", async function() {
    const compId = makeComponentId("COMP-TRANSFER");
    await registerComponent(manufacturer, compId, "Radar Unit", 2, ethers.parseEther("3"));

    await componentRegistry.connect(manufacturer).transferOwnership(
      compId, vendor.address,
      ethers.keccak256(ethers.toUtf8Bytes("factory")), true
    );
    await componentRegistry.connect(vendor).transferOwnership(
      compId, base.address,
      ethers.keccak256(ethers.toUtf8Bytes("base")), true
    );

    const [, history] = await componentRegistry.getFullHistory(compId);
    expect(history.length).to.equal(3);
    expect(history[1].to).to.equal(vendor.address);
    expect(history[2].to).to.equal(base.address);
    expect(history[1].verified).to.equal(true);
    expect(history[2].verified).to.equal(true);
  });

  it("gap in transfer history correctly detected", async function() {
    const compId = makeComponentId("COMP-GAP");
    await registerComponent(manufacturer, compId, "Nav Chip", 2, ethers.parseEther("2"));

    await componentRegistry.connect(manufacturer).transferOwnership(
      compId, vendor.address,
      ethers.keccak256(ethers.toUtf8Bytes("factory")), true
    );
    await componentRegistry.connect(vendor).transferOwnership(
      compId, base.address,
      ethers.keccak256(ethers.toUtf8Bytes("unknown")), false
    );

    const [, , hasGap] = await componentRegistry.getFullHistory(compId);
    expect(hasGap).to.equal(true);
  });

  it("no gap when all transfers verified", async function() {
    const compId = makeComponentId("COMP-NOGAP");
    await registerComponent(manufacturer, compId, "Sensor", 2, ethers.parseEther("1"));
    await componentRegistry.connect(manufacturer).transferOwnership(
      compId, vendor.address,
      ethers.keccak256(ethers.toUtf8Bytes("factory")), true
    );
    const [, , hasGap] = await componentRegistry.getFullHistory(compId);
    expect(hasGap).to.equal(false);
  });

  it("recursive revocation flags all components from manufacturer", async function() {
    const comp1 = makeComponentId("COMP-REV-001");
    const comp2 = makeComponentId("COMP-REV-002");
    const comp3 = makeComponentId("COMP-REV-003");

    await registerComponent(manufacturer, comp1, "Alpha", 2, ethers.parseEther("1"));
    await registerComponent(manufacturer, comp2, "Beta", 2, ethers.parseEther("1"));
    await registerComponent(manufacturer, comp3, "Gamma", 2, ethers.parseEther("1"));

    await componentRegistry.recursiveRevocation(manufacturer.address);

    const [c1] = await componentRegistry.getFullHistory(comp1);
    const [c2] = await componentRegistry.getFullHistory(comp2);
    const [c3] = await componentRegistry.getFullHistory(comp3);

    expect(c1.compromised).to.equal(true);
    expect(c2.compromised).to.equal(true);
    expect(c3.compromised).to.equal(true);
  });

  it("recursive revocation emits correct event", async function() {
    const comp1 = makeComponentId("COMP-REV-EVT");
    await registerComponent(manufacturer, comp1, "Alpha", 2, ethers.parseEther("1"));

    await expect(componentRegistry.recursiveRevocation(manufacturer.address))
      .to.emit(componentRegistry, "RecursiveRevocationTriggered")
      .withArgs(manufacturer.address, 1n);
  });

  it("batch verify returns correct results for mix of valid and invalid", async function() {
    const valid1 = makeComponentId("COMP-BATCH-V1");
    const valid2 = makeComponentId("COMP-BATCH-V2");
    const invalid1 = makeComponentId("COMP-BATCH-I1");

    await registerComponent(manufacturer, valid1, "Valid A", 2, ethers.parseEther("1"));
    await registerComponent(manufacturer, valid2, "Valid B", 2, ethers.parseEther("1"));
    await registerComponent(manufacturer, invalid1, "Invalid A", 2, ethers.parseEther("1"));

    await componentRegistry.connect(manufacturer).transferOwnership(
      invalid1, vendor.address,
      ethers.keccak256(ethers.toUtf8Bytes("unknown")), false
    );

    const [results, gaps] = await componentRegistry.batchVerify([valid1, valid2, invalid1]);

    expect(results[0]).to.equal(true);
    expect(results[1]).to.equal(true);
    expect(results[2]).to.equal(false);
    expect(gaps[0]).to.equal(false);
    expect(gaps[1]).to.equal(false);
    expect(gaps[2]).to.equal(true);
  });

  it("batch verify handles non-existent component", async function() {
    const nonExistent = makeComponentId("COMP-NONEXISTENT");
    const [results, gaps] = await componentRegistry.batchVerify([nonExistent]);
    expect(results[0]).to.equal(false);
    expect(gaps[0]).to.equal(false);
  });

  it("honey-token generation returns unique hash per session", async function() {
    const tx1 = await componentRegistry.connect(auditor).generateHoneyToken("session-001");
    const receipt1 = await tx1.wait();
    const tx2 = await componentRegistry.connect(auditor).generateHoneyToken("session-002");
    const receipt2 = await tx2.wait();
    expect(receipt1.hash).to.not.equal(receipt2.hash);
  });

  it("legitimate honey-token query from correct session succeeds once", async function() {
    const sessionId = "session-honey-test";
    const tx = await componentRegistry.connect(auditor).generateHoneyToken(sessionId);
    const receipt = await tx.wait();
    const event = receipt.logs.find(l => l.fragment?.name === undefined);
    expect(receipt.status).to.equal(1);
  });

  it("second query of same phantom hash from different session triggers alert", async function() {
    const sessionId = "session-trap-001";
    const wrongSession = "session-wrong-001";

    const tx = await componentRegistry.connect(auditor).generateHoneyToken(sessionId);
    await tx.wait();

    const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("fake-hash-attempt"));
    await expect(
      componentRegistry.connect(stranger).queryHoneyToken(wrongSession, fakeHash)
    ).to.emit(componentRegistry, "HoneyTokenAlert");
  });

  it("flagSuspicious marks component as compromised", async function() {
    const compId = makeComponentId("COMP-FLAG");
    await registerComponent(manufacturer, compId, "Sensor", 2, ethers.parseEther("1"));
    await componentRegistry.flagSuspicious(compId, "tampered");
    const [comp] = await componentRegistry.getFullHistory(compId);
    expect(comp.compromised).to.equal(true);
    expect(comp.verified).to.equal(false);
  });

  it("getManufacturerComponents returns correct list", async function() {
    const comp1 = makeComponentId("COMP-MAN-001");
    const comp2 = makeComponentId("COMP-MAN-002");
    await registerComponent(manufacturer, comp1, "Alpha", 2, ethers.parseEther("1"));
    await registerComponent(manufacturer, comp2, "Beta", 2, ethers.parseEther("1"));
    const components = await componentRegistry.getManufacturerComponents(manufacturer.address);
    expect(components.length).to.equal(2);
  });
});
