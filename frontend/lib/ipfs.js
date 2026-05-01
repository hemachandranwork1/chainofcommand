import { encryptField, decryptField } from "./encryption";

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || process.env.PINATA_API_KEY || "";
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || process.env.PINATA_SECRET_KEY || "";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

export async function uploadToIPFS(data) {
  try {
    const isFile = data instanceof File || data instanceof Blob;
    const url = isFile
      ? "https://api.pinata.cloud/pinning/pinFileToIPFS"
      : "https://api.pinata.cloud/pinning/pinJSONToIPFS";

    let body;
    let headers = {
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
    };

    if (isFile) {
      const formData = new FormData();
      formData.append("file", data);
      body = formData;
    } else {
      body = JSON.stringify({
        pinataContent: typeof data === "object" ? data : { data },
        pinataMetadata: { name: `chainofcommand-${Date.now()}` },
      });
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      console.error("IPFS upload failed:", response.statusText);
      return null;
    }

    const result = await response.json();
    return result.IpfsHash || null;
  } catch (error) {
    console.error("IPFS upload error:", error);
    return null;
  }
}

export async function getFromIPFS(cid) {
  try {
    const response = await fetch(`${PINATA_GATEWAY}${cid}`);
    if (!response.ok) {
      console.error("IPFS fetch failed:", response.statusText);
      return null;
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    console.error("IPFS fetch error:", error);
    return null;
  }
}

export async function encryptCID(cid, sharedSecret) {
  try {
    const encrypted = await encryptField(cid, sharedSecret);
    return encrypted;
  } catch (error) {
    console.error("CID encryption error:", error);
    return null;
  }
}

export async function decryptCID(encryptedCID, sharedSecret) {
  try {
    const decrypted = await decryptField(encryptedCID, sharedSecret);
    return decrypted;
  } catch (error) {
    console.error("CID decryption error:", error);
    return null;
  }
}

export async function uploadEncryptedToIPFS(data, sharedSecret) {
  try {
    const plaintext = typeof data === "string" ? data : JSON.stringify(data);
    const encrypted = await encryptField(plaintext, sharedSecret);
    const cid = await uploadToIPFS({ encrypted, timestamp: Date.now() });
    return cid;
  } catch (error) {
    console.error("Encrypted upload error:", error);
    return null;
  }
}

export function getIPFSUrl(cid) {
  return `${PINATA_GATEWAY}${cid}`;
}

export function getPolygonExplorerUrl(txHash) {
  return `https://amoy.polygonscan.com/tx/${txHash}`;
}
