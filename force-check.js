const hre = require("hardhat");
const addresses = require("./deployedAddresses.json");

async function main() {
  const signers = await hre.ethers.getSigners();
  // Use the correct seeded procurement officer (signers[7] from seed.js)
  const procurementOfficer = signers[7];
  const componentId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("COMP-GUIDANCE-001"));
  const fakeComponentId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("COMP-FAKE-GAP-001"));
  const gate = await hre.ethers.getContractAt("ProcurementGate", addresses.ProcurementGate);

  console.log("Testing legitimate component...");
  try {
    const tx = await gate.connect(procurementOfficer).approveProcurement(
      procurementOfficer.address,
      componentId,
      "valid-token",
      hre.ethers.keccak256(hre.ethers.toUtf8Bytes("location"))
    );
    await tx.wait();
    console.log("✅ Legitimate procurement APPROVED");
  } catch (e) {
    console.log("❌ Legitimate procurement failed:", e.message);
  }

  console.log("\nTesting fake component...");
  try {
    const tx2 = await gate.connect(procurementOfficer).approveProcurement(
      procurementOfficer.address,
      fakeComponentId,
      "valid-token",
      hre.ethers.keccak256(hre.ethers.toUtf8Bytes("location"))
    );
    await tx2.wait();
    console.log("❌ Fake component was APPROVED (should not happen!)");
  } catch (e) {
    console.log("✅ Fake component correctly REJECTED:", e.message.substring(0, 100));
  }
}

main().catch(console.error);
