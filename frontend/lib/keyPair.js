import { ethers } from "ethers";

const KEY_STORAGE_KEY = "coc_keypair";

export function generateKeyPair() {
  const wallet = ethers.Wallet.createRandom();
  return {
    privateKey: wallet.privateKey,
    address: wallet.address,
    mnemonic: wallet.mnemonic?.phrase || null,
  };
}

export async function signMessage(privateKey, message) {
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(message);
  return signature;
}

export function verifySignature(message, signature, expectedAddress) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

export function storeKeyPair(privateKey, address, pin) {
  try {
    const pinHash = simpleHash(pin);
    const encrypted = xorEncrypt(privateKey, pinHash);
    const payload = JSON.stringify({
      encrypted,
      address,
      timestamp: Date.now(),
    });
    sessionStorage.setItem(KEY_STORAGE_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

export function loadKeyPair(pin) {
  try {
    const raw = sessionStorage.getItem(KEY_STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    const pinHash = simpleHash(pin);
    const privateKey = xorEncrypt(payload.encrypted, pinHash);
    const wallet = new ethers.Wallet(privateKey);
    if (wallet.address.toLowerCase() !== payload.address.toLowerCase()) {
      return null;
    }
    return {
      privateKey,
      address: payload.address,
    };
  } catch {
    return null;
  }
}

export function clearKeyPair() {
  sessionStorage.removeItem(KEY_STORAGE_KEY);
}

export function getStoredAddress() {
  try {
    const raw = sessionStorage.getItem(KEY_STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    return payload.address || null;
  } catch {
    return null;
  }
}

export function walletFromPrivateKey(privateKey) {
  return new ethers.Wallet(privateKey);
}

function simpleHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").repeat(8);
}

function xorEncrypt(text, key) {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(result);
}
