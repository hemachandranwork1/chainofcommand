const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const addressesPath = path.join(__dirname, "../deployedAddresses.json");
  if (!fs.existsSync(addressesPath)) {
    throw new Error("deployedAddresses.json not found. Run deploy.js first.");
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  const signers = await ethers.getSigners();

  console.log("Seeding ChainOfCommand with test data...");
  console.log("Using addresses:", addresses);

  const identityRegistry = await ethers.getContractAt("IdentityRegistry", addresses.IdentityRegistry);
  const componentRegistry = await ethers.getContractAt("ComponentRegistry", addresses.ComponentRegistry);
  const procurementGate = await ethers.getContractAt("ProcurementGate", addresses.ProcurementGate);

  const commander = signers[0];
  const auditorSigner = signers[1];
  const manufacturer = signers[3];
  const vendor = signers[4];
  const base = signers[5];
  const soldier1 = signers[6];
  const soldier2 = signers[7];
  const soldier3 = signers[8];

  console.log("\n--- Seeding Soldiers (using deployer bypass) ---");

  // Register soldiers directly – the IdentityRegistry now allows deployer address
  async function registerSoldierDirect(wallet, rank, clearance, did) {
    const tx = await identityRegistry.connect(commander).registerSoldier(
      wallet,
      rank,
      clearance,
      did
    );
    await tx.wait();
    console.log(`Registered soldier ${wallet} with clearance ${clearance}`);
  }

  // Rank enum: 0=SOLDIER, 1=JUNIOR_OFFICER, 2=PROCUREMENT_OFFICER, 3=COMMANDER, 4=AUDITOR
  await registerSoldierDirect(soldier1.address, 1, 2, "did:example:junior-officer-001");
  await registerSoldierDirect(soldier2.address, 2, 3, "did:example:procurement-officer-001");
  await registerSoldierDirect(soldier3.address, 2, 4, "did:example:procurement-officer-002");
  await registerSoldierDirect(auditorSigner.address, 4, 5, "did:example:auditor-001");
  await registerSoldierDirect(commander.address, 3, 5, "did:example:commander-001");

  console.log("\n--- Seeding Legitimate Components ---");

  async function registerAndTransfer(componentId, componentType, category, value) {
    const tx1 = await componentRegistry.connect(manufacturer).registerComponent(
      componentId,
      componentType,
      category,
      value,
      ethers.keccak256(ethers.toUtf8Bytes(componentId.toString() + "-puf")),
      "encrypted-ipfs-cid-" + componentId.toString().slice(2, 10)
    );
    await tx1.wait();

    const tx2 = await componentRegistry.connect(manufacturer).transferOwnership(
      componentId,
      vendor.address,
      ethers.keccak256(ethers.toUtf8Bytes("factory-location")),
      true
    );
    await tx2.wait();

    const tx3 = await componentRegistry.connect(vendor).transferOwnership(
      componentId,
      base.address,
      ethers.keccak256(ethers.toUtf8Bytes("base-location")),
      true
    );
    await tx3.wait();

    console.log(`Registered legitimate component: ${componentType}`);
    return componentId;
  }

  const legit1 = ethers.keccak256(ethers.toUtf8Bytes("COMP-GUIDANCE-001"));
  const legit2 = ethers.keccak256(ethers.toUtf8Bytes("COMP-RADAR-002"));
  const legit3 = ethers.keccak256(ethers.toUtf8Bytes("COMP-COMM-003"));
  const legit4 = ethers.keccak256(ethers.toUtf8Bytes("COMP-NAV-004"));
  const legit5 = ethers.keccak256(ethers.toUtf8Bytes("COMP-SENSOR-005"));

  await registerAndTransfer(legit1, "Guidance System Module", 3, ethers.parseEther("10"));
  await registerAndTransfer(legit2, "Radar Array Unit", 3, ethers.parseEther("15"));
  await registerAndTransfer(legit3, "Communication Module", 2, ethers.parseEther("5"));
  await registerAndTransfer(legit4, "Navigation Chip", 2, ethers.parseEther("3"));
  await registerAndTransfer(legit5, "Thermal Sensor", 2, ethers.parseEther("2"));

  console.log("\n--- Seeding Fake Components ---");

  const fake1 = ethers.keccak256(ethers.toUtf8Bytes("COMP-FAKE-GAP-001"));
  const fakeRegTx = await componentRegistry.connect(manufacturer).registerComponent(
    fake1,
    "Counterfeit Guidance Module",
    3,
    ethers.parseEther("10"),
    ethers.ZeroHash,
    "encrypted-ipfs-fake-001"
  );
  await fakeRegTx.wait();
  //deepseek said to fuckwith this file 
  await componentRegistry.connect(manufacturer).flagSuspicious(fake1, "Compromised for demo");
  const fakeTransfer1 = await componentRegistry.connect(manufacturer).transferOwnership(
    fake1,
    vendor.address,
    ethers.keccak256(ethers.toUtf8Bytes("factory-location")),
    true
  );
  await fakeTransfer1.wait();

  const fakeTransfer2 = await componentRegistry.connect(vendor).transferOwnership(
    fake1,
    base.address,
    ethers.keccak256(ethers.toUtf8Bytes("unknown-location")),
    false
  );
  await fakeTransfer2.wait();
  await componentRegistry.connect(manufacturer).flagSuspicious(fake1, "Demo fake component - compromised");
  console.log("Registered fake component 1: supply chain gap");

  const compromisedManufacturer = signers[9] || signers[0];
  const fake2 = ethers.keccak256(ethers.toUtf8Bytes("COMP-FAKE-MANUF-002"));
  const fakeReg2 = await componentRegistry.connect(compromisedManufacturer).registerComponent(
    fake2,
    "Backdoored Navigation Chip",
    2,
    ethers.parseEther("3"),
    ethers.ZeroHash,
    "encrypted-ipfs-fake-002"
  );
  await fakeReg2.wait();
  console.log("Registered fake component 2: unregistered manufacturer source");

  console.log("\n--- Seeding Honey-Token Phantom Components ---");

  const honeySession1 = "auditor-session-honey-001";
  const honeySession2 = "auditor-session-honey-002";
  const honeySession3 = "auditor-session-honey-003";

  await componentRegistry.connect(auditorSigner).generateHoneyToken(honeySession1);
  await componentRegistry.connect(auditorSigner).generateHoneyToken(honeySession2);
  await componentRegistry.connect(auditorSigner).generateHoneyToken(honeySession3);
  console.log("Generated 3 dynamic honey-token phantom components");

  console.log("\n--- Seeding Cloning Detection Component ---");

  const cloningComp = ethers.keccak256(ethers.toUtf8Bytes("COMP-CLONE-DETECT-001"));
  await componentRegistry.connect(manufacturer).registerComponent(
    cloningComp,
    "GPS Navigation Module",
    2,
    ethers.parseEther("4"),
    ethers.keccak256(ethers.toUtf8Bytes("clone-comp-puf")),
    "encrypted-ipfs-clone-001"
  );
  await componentRegistry.connect(manufacturer).transferOwnership(
    cloningComp,
    vendor.address,
    ethers.keccak256(ethers.toUtf8Bytes("base-germany-52.5200-13.4050")),
    true
  );
  console.log("Cloning detection component seeded");

  console.log("\n--- Seeding Recursive Revocation Data ---");

  const revokeManufacturer = signers[9] || signers[0];
  const revComp1 = ethers.keccak256(ethers.toUtf8Bytes("COMP-REVOKE-001"));
  const revComp2 = ethers.keccak256(ethers.toUtf8Bytes("COMP-REVOKE-002"));
  const revComp3 = ethers.keccak256(ethers.toUtf8Bytes("COMP-REVOKE-003"));

  for (const [compId, compName] of [
    [revComp1, "Revokable Component Alpha"],
    [revComp2, "Revokable Component Beta"],
    [revComp3, "Revokable Component Gamma"]
  ]) {
    await componentRegistry.connect(revokeManufacturer).registerComponent(
      compId,
      compName,
      2,
      ethers.parseEther("2"),
      ethers.ZeroHash,
      "encrypted-ipfs-revoke"
    );
  }
  console.log("Registered 3 components under compromised manufacturer for recursive revocation demo");

  console.log("\n--- Seeding Flagged Device Token ---");

  const COMPROMISED_TOKEN = "DEVICE-TOKEN-COMPROMISED-ROOTED-001";
  await procurementGate.connect(commander).flagDeviceToken(COMPROMISED_TOKEN);
  console.log("Flagged compromised device token:", COMPROMISED_TOKEN);

  const seedData = {
    soldiers: {
      juniorOfficer: soldier1.address,
      procurementOfficer: soldier2.address,
      seniorProcurementOfficer: soldier3.address,
      auditor: auditorSigner.address,
      commander: commander.address
    },
    components: {
      legitimate: [legit1, legit2, legit3, legit4, legit5],
      fake: [fake1, fake2],
      cloning: cloningComp,
      revokable: [revComp1, revComp2, revComp3]
    },
    manufacturers: {
      legitimate: manufacturer.address,
      compromised: revokeManufacturer.address
    },
    honeyTokenSessions: [honeySession1, honeySession2, honeySession3],
    compromisedDeviceToken: COMPROMISED_TOKEN,
    vendor: vendor.address,
    base: base.address
  };

  const seedPath = path.join(__dirname, "../seedData.json");
  fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2));
  console.log("\nSeed data saved to seedData.json");
  console.log("\n=== SEEDING COMPLETE ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
