import { ethers } from "ethers";

import AuditLogABI from "../../artifacts/contracts/AuditLog.sol/AuditLog.json";
import IdentityRegistryABI from "../../artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json";
import ComponentRegistryABI from "../../artifacts/contracts/ComponentRegistry.sol/ComponentRegistry.json";
import ProcurementGateABI from "../../artifacts/contracts/ProcurementGate.sol/ProcurementGate.json";
import GovernanceMultiSigABI from "../../artifacts/contracts/GovernanceMultiSig.sol/GovernanceMultiSig.json";
import CircuitBreakerABI from "../../artifacts/contracts/CircuitBreaker.sol/CircuitBreaker.json";
import deployedAddresses from "../../deployedAddresses.json";

export function getProvider() {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return new ethers.JsonRpcProvider("http://127.0.0.1:8545");
}

export async function getSigner() {
  const provider = getProvider();
  if (provider instanceof ethers.BrowserProvider) {
    return await provider.getSigner();
  }
  const wallet = ethers.Wallet.fromPhrase(
    process.env.NEXT_PUBLIC_TEST_MNEMONIC || "test test test test test test test test test test test junk"
  );
  return wallet.connect(provider);
}

function getContract(address, abi, signerOrProvider) {
  return new ethers.Contract(address, abi.abi, signerOrProvider);
}

export async function getContracts(withSigner = false) {
  const signerOrProvider = withSigner ? await getSigner() : getProvider();

  return {
    auditLog: getContract(deployedAddresses.AuditLog, AuditLogABI, signerOrProvider),
    identityRegistry: getContract(deployedAddresses.IdentityRegistry, IdentityRegistryABI, signerOrProvider),
    componentRegistry: getContract(deployedAddresses.ComponentRegistry, ComponentRegistryABI, signerOrProvider),
    procurementGate: getContract(deployedAddresses.ProcurementGate, ProcurementGateABI, signerOrProvider),
    governanceMultiSig: getContract(deployedAddresses.GovernanceMultiSig, GovernanceMultiSigABI, signerOrProvider),
    circuitBreaker: getContract(deployedAddresses.CircuitBreaker, CircuitBreakerABI, signerOrProvider),
  };
}

export const auditLog = getContract(
  deployedAddresses.AuditLog,
  AuditLogABI,
  getProvider()
);

export const identityRegistry = getContract(
  deployedAddresses.IdentityRegistry,
  IdentityRegistryABI,
  getProvider()
);

export const componentRegistry = getContract(
  deployedAddresses.ComponentRegistry,
  ComponentRegistryABI,
  getProvider()
);

export const procurementGate = getContract(
  deployedAddresses.ProcurementGate,
  ProcurementGateABI,
  getProvider()
);

export const governanceMultiSig = getContract(
  deployedAddresses.GovernanceMultiSig,
  GovernanceMultiSigABI,
  getProvider()
);

export const circuitBreaker = getContract(
  deployedAddresses.CircuitBreaker,
  CircuitBreakerABI,
  getProvider()
);

export const DEPLOYED_ADDRESSES = deployedAddresses;
