const hre = require("hardhat");
const addresses = require("./deployedAddresses.json");

async function main() {
  const componentRegistry = await hre.ethers.getContractAt("ComponentRegistry", addresses.ComponentRegistry);
  const fakeId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("COMP-FAKE-GAP-001"));
  
  console.log("Fake component ID:", fakeId);
  const [comp, history, hasGap] = await componentRegistry.getFullHistory(fakeId);
  console.log("Component exists:", comp.exists);
  console.log("Component compromised:", comp.compromised);
  console.log("Has gap:", hasGap);
  console.log("History length:", history.length);
  for (let i = 0; i < history.length; i++) {
    console.log(`  Transfer ${i}: from=${history[i].from} to=${history[i].to} verified=${history[i].verified}`);
  }
}

main().catch(console.error);
