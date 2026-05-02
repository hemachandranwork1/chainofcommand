const hre = require("hardhat");
const addresses = require("./deployedAddresses.json");

async function main() {
  const signers = await hre.ethers.getSigners();

  // signers[0] is commander - registered in seed with clearance 5
  // signers[7] is procurement officer - registered in seed with clearance 3
  const commander = signers[0];
  const procurementOfficer = signers[7];

  const legitComponent = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("COMP-GUIDANCE-001"));
  const fakeComponent = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("COMP-FAKE-GAP-001"));

  const gate = await hre.ethers.getContractAt("ProcurementGate", addresses.ProcurementGate);
  const identityRegistry = await hre.ethers.getContractAt("IdentityRegistry", addresses.IdentityRegistry);
  const componentRegistry = await hre.ethers.getContractAt("ComponentRegistry", addresses.ComponentRegistry);

  // Verify both soldiers are active before testing
  console.log("Commander active:", await identityRegistry.isActive(commander.address));
  console.log("Officer active:", await identityRegistry.isActive(procurementOfficer.address));

  // Verify fake component state
  const [fakeComp, , fakeHasGap] = await componentRegistry.getFullHistory(fakeComponent);
  console.log("Fake component compromised:", fakeComp.compromised);
  console.log("Fake component hasGap:", fakeHasGap);
  console.log("Fake component categoryLevel:", fakeComp.categoryLevel.toString());
  console.log("Commander clearance:", (await identityRegistry.getClearance(commander.address)).toString());

  console.log("\n--- Testing legitimate component ---");
  try {
    const tx = await gate.connect(procurementOfficer).approveProcurement(
      procurementOfficer.address,
      legitComponent,
      "valid-token",
      hre.ethers.keccak256(hre.ethers.toUtf8Bytes("location"))
    );
    const receipt = await tx.wait();
    const granted = receipt.logs.some(l => {
      try { return gate.interface.parseLog(l)?.name === "ApprovalGranted"; } catch { return false; }
    });
    console.log(granted ? "✅ Legitimate procurement APPROVED" : "❌ Legitimate procurement DENIED (unexpected)");
  } catch (e) {
    console.log("❌ Legitimate failed:", e.message.substring(0, 120));
  }

  console.log("\n--- Testing fake component (gap detection) ---");
  try {
    const tx2 = await gate.connect(commander).approveProcurement(
      commander.address,
      fakeComponent,
      "valid-token",
      hre.ethers.keccak256(hre.ethers.toUtf8Bytes("location"))
    );
    const receipt2 = await tx2.wait();
    const denied = receipt2.logs.some(l => {
      try { return gate.interface.parseLog(l)?.name === "ApprovalDenied"; } catch { return false; }
    });
    const granted = receipt2.logs.some(l => {
      try { return gate.interface.parseLog(l)?.name === "ApprovalGranted"; } catch { return false; }
    });
    if (denied) {
      const deniedLog = receipt2.logs.find(l => {
        try { return gate.interface.parseLog(l)?.name === "ApprovalDenied"; } catch { return false; }
      });
      const parsed = gate.interface.parseLog(deniedLog);
      console.log("✅ Fake component correctly REJECTED:", parsed.args.reason);
    } else if (granted) {
      console.log("❌ Fake component was APPROVED (should not happen!)");
    }
  } catch (e) {
    console.log("✅ Fake component correctly REJECTED (revert):", e.message.substring(0, 120));
  }
}

main().catch(console.error);
