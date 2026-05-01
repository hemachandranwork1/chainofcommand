const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ChainOfCommand contracts with:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const addresses = {};

  // Step 1: Deploy AuditLog with zero address placeholder for ProcurementGate
  console.log("\n[1/6] Deploying AuditLog...");
  const AuditLog = await ethers.getContractFactory("AuditLog");
  const auditLog = await AuditLog.deploy(ethers.ZeroAddress);
  await auditLog.waitForDeployment();
  addresses.AuditLog = await auditLog.getAddress();
  console.log("AuditLog deployed to:", addresses.AuditLog);

  // Step 2: Deploy IdentityRegistry with zero address placeholder for GovernanceMultiSig
  console.log("\n[2/6] Deploying IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy(ethers.ZeroAddress);
  await identityRegistry.waitForDeployment();
  addresses.IdentityRegistry = await identityRegistry.getAddress();
  console.log("IdentityRegistry deployed to:", addresses.IdentityRegistry);

  // Step 3: Deploy ComponentRegistry
  console.log("\n[3/6] Deploying ComponentRegistry...");
  const ComponentRegistry = await ethers.getContractFactory("ComponentRegistry");
  const componentRegistry = await ComponentRegistry.deploy();
  await componentRegistry.waitForDeployment();
  addresses.ComponentRegistry = await componentRegistry.getAddress();
  console.log("ComponentRegistry deployed to:", addresses.ComponentRegistry);

  // Step 4: Deploy GovernanceMultiSig with three signers
  console.log("\n[4/6] Deploying GovernanceMultiSig...");
  const signers = await ethers.getSigners();
  const commander = signers[0].address;
  const auditor = signers[1] ? signers[1].address : signers[0].address;
  const procurementCommand = signers[2] ? signers[2].address : signers[0].address;

  const GovernanceMultiSig = await ethers.getContractFactory("GovernanceMultiSig");
  const governanceMultiSig = await GovernanceMultiSig.deploy(commander, auditor, procurementCommand);
  await governanceMultiSig.waitForDeployment();
  addresses.GovernanceMultiSig = await governanceMultiSig.getAddress();
  console.log("GovernanceMultiSig deployed to:", addresses.GovernanceMultiSig);

  // Step 5: Deploy CircuitBreaker
  console.log("\n[5/6] Deploying CircuitBreaker...");
  const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
  const circuitBreaker = await CircuitBreaker.deploy(addresses.GovernanceMultiSig);
  await circuitBreaker.waitForDeployment();
  addresses.CircuitBreaker = await circuitBreaker.getAddress();
  console.log("CircuitBreaker deployed to:", addresses.CircuitBreaker);

  // Step 6: Deploy ProcurementGate with all contract addresses
  console.log("\n[6/6] Deploying ProcurementGate...");
  const ProcurementGate = await ethers.getContractFactory("ProcurementGate");
  const procurementGate = await ProcurementGate.deploy(
    addresses.IdentityRegistry,
    addresses.ComponentRegistry,
    addresses.AuditLog,
    addresses.CircuitBreaker
  );
  await procurementGate.waitForDeployment();
  addresses.ProcurementGate = await procurementGate.getAddress();
  console.log("ProcurementGate deployed to:", addresses.ProcurementGate);

  // Update AuditLog with real ProcurementGate address
  console.log("\nUpdating AuditLog with ProcurementGate address...");
  const auditLogUpdateTx = await auditLog.setProcurementGate(addresses.ProcurementGate);
  await auditLogUpdateTx.wait();
  console.log("AuditLog updated.");

  // Update IdentityRegistry with real GovernanceMultiSig address
  console.log("Updating GovernanceMultiSig contract references...");
  const govSetTx = await governanceMultiSig.setContracts(
    addresses.IdentityRegistry,
    addresses.CircuitBreaker
  );
  await govSetTx.wait();
  console.log("GovernanceMultiSig references updated.");

  // Store governance member addresses for seeding
  addresses.members = {
    commander,
    auditor,
    procurementCommand
  };

  // Save to deployedAddresses.json
  const outputPath = path.join(__dirname, "../deployedAddresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log("\nAll addresses saved to deployedAddresses.json");
  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log(JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

