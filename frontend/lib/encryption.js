export async function generateECDHKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

export async function deriveSharedSecret(ownPrivateKey, otherPublicKey) {
  const sharedSecret = await window.crypto.subtle.deriveKey(
    { name: "ECDH", public: otherPublicKey },
    ownPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return sharedSecret;
}

export async function encryptField(plaintext, sharedSecret) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedSecret,
    encoded
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptField(base64Ciphertext, sharedSecret) {
  const combined = Uint8Array.from(atob(base64Ciphertext), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sharedSecret,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

export async function exportPublicKey(publicKey) {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  const bytes = new Uint8Array(exported);
  return btoa(String.fromCharCode(...bytes));
}

export async function importPublicKey(base64Key) {
  const bytes = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return await window.crypto.subtle.importKey(
    "spki",
    bytes.buffer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

export async function exportPrivateKey(privateKey) {
  const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
  const bytes = new Uint8Array(exported);
  return btoa(String.fromCharCode(...bytes));
}

export async function importPrivateKey(base64Key) {
  const bytes = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return await window.crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
}

export async function encryptWithPassword(plaintext, password) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const key = await window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );

  const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  result.set(salt, 0);
  result.set(iv, 16);
  result.set(new Uint8Array(ciphertext), 28);

  return btoa(String.fromCharCode(...result));
}

export async function decryptWithPassword(base64Data, password) {
  const combined = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
