const { ethers, run } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function verifyContract(address, constructorArguments) {
  try {
    await run("verify:verify", {
      address,
      constructorArguments
    });
    console.log(`Verified: ${address}`);
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`Already verified: ${address}`);
    } else {
      console.warn(`Verification failed for ${address}:`, error.message);
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying to Polygon Sepolia with:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const addresses = {};
  const constructorArgs = {};

  // Step 1: Deploy AuditLog
  console.log("\n[1/6] Deploying AuditLog...");
  const AuditLog = await ethers.getContractFactory("AuditLog");
  const auditLog = await AuditLog.deploy(ethers.ZeroAddress);
  await auditLog.waitForDeployment();
  addresses.AuditLog = await auditLog.getAddress();
  constructorArgs.AuditLog = [ethers.ZeroAddress];
  console.log("AuditLog deployed to:", addresses.AuditLog);

  // Step 2: Deploy IdentityRegistry
  console.log("\n[2/6] Deploying IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy(ethers.ZeroAddress);
  await identityRegistry.waitForDeployment();
  addresses.IdentityRegistry = await identityRegistry.getAddress();
  constructorArgs.IdentityRegistry = [ethers.ZeroAddress];
  console.log("IdentityRegistry deployed to:", addresses.IdentityRegistry);

  // Step 3: Deploy ComponentRegistry
  console.log("\n[3/6] Deploying ComponentRegistry...");
  const ComponentRegistry = await ethers.getContractFactory("ComponentRegistry");
  const componentRegistry = await ComponentRegistry.deploy();
  await componentRegistry.waitForDeployment();
  addresses.ComponentRegistry = await componentRegistry.getAddress();
  constructorArgs.ComponentRegistry = [];
  console.log("ComponentRegistry deployed to:", addresses.ComponentRegistry);

  // Step 4: Deploy GovernanceMultiSig
  console.log("\n[4/6] Deploying GovernanceMultiSig...");
  const commander = deployer.address;
  const auditor = process.env.AUDITOR_ADDRESS || deployer.address;
  const procurementCommand = process.env.PROCUREMENT_ADDRESS || deployer.address;

  const GovernanceMultiSig = await ethers.getContractFactory("GovernanceMultiSig");
  const governanceMultiSig = await GovernanceMultiSig.deploy(commander, auditor, procurementCommand);
  await governanceMultiSig.waitForDeployment();
  addresses.GovernanceMultiSig = await governanceMultiSig.getAddress();
  constructorArgs.GovernanceMultiSig = [commander, auditor, procurementCommand];
  console.log("GovernanceMultiSig deployed to:", addresses.GovernanceMultiSig);

  // Step 5: Deploy CircuitBreaker
  console.log("\n[5/6] Deploying CircuitBreaker...");
  const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
  const circuitBreaker = await CircuitBreaker.deploy(addresses.GovernanceMultiSig);
  await circuitBreaker.waitForDeployment();
  addresses.CircuitBreaker = await circuitBreaker.getAddress();
  constructorArgs.CircuitBreaker = [addresses.GovernanceMultiSig];
  console.log("CircuitBreaker deployed to:", addresses.CircuitBreaker);

  // Step 6: Deploy ProcurementGate
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
  constructorArgs.ProcurementGate = [
    addresses.IdentityRegistry,
    addresses.ComponentRegistry,
    addresses.AuditLog,
    addresses.CircuitBreaker
  ];
  console.log("ProcurementGate deployed to:", addresses.ProcurementGate);

  // Update references
  console.log("\nUpdating contract references...");
  const auditUpdateTx = await auditLog.setProcurementGate(addresses.ProcurementGate);
  await auditUpdateTx.wait();
  const govSetTx = await governanceMultiSig.setContracts(addresses.IdentityRegistry, addresses.CircuitBreaker);
  await govSetTx.wait();
  console.log("References updated.");

  addresses.members = { commander, auditor, procurementCommand };
  addresses.network = "polygonSepolia";
  addresses.chainId = 80002;

  const outputPath = path.join(__dirname, "../deployedAddresses.testnet.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log("\nAddresses saved to deployedAddresses.testnet.json");

  // Wait for block confirmations before verifying
  console.log("\nWaiting 30 seconds for block confirmations before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  console.log("\n--- Verifying Contracts on Polygonscan ---");
  await verifyContract(addresses.AuditLog, constructorArgs.AuditLog);
  await verifyContract(addresses.IdentityRegistry, constructorArgs.IdentityRegistry);
  await verifyContract(addresses.ComponentRegistry, constructorArgs.ComponentRegistry);
  await verifyContract(addresses.GovernanceMultiSig, constructorArgs.GovernanceMultiSig);
  await verifyContract(addresses.CircuitBreaker, constructorArgs.CircuitBreaker);
  await verifyContract(addresses.ProcurementGate, constructorArgs.ProcurementGate);

  console.log("\n=== TESTNET DEPLOYMENT COMPLETE ===");
  console.log(JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
