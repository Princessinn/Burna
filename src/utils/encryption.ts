// Client-side encryption utilities for anonymous chat
export interface EncryptionKeys {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedMessage {
  encryptedData: string;
  iv: string;
}

// Generate a key pair for encryption
export async function generateKeyPair(): Promise<EncryptionKeys> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

// Generate a symmetric key for message encryption
export async function generateSymmetricKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt text with AES-GCM
export async function encryptMessage(text: string, key: CryptoKey): Promise<EncryptedMessage> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data
  );

  return {
    encryptedData: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// Decrypt message with AES-GCM
export async function decryptMessage(encryptedMessage: EncryptedMessage, key: CryptoKey): Promise<string> {
  const encryptedData = new Uint8Array(
    atob(encryptedMessage.encryptedData)
      .split('')
      .map(char => char.charCodeAt(0))
  );
  
  const iv = new Uint8Array(
    atob(encryptedMessage.iv)
      .split('')
      .map(char => char.charCodeAt(0))
  );

  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

// Export key to string for storage
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(exported);
}

// Import key from string
export async function importKey(keyString: string, algorithm: string, usage: KeyUsage[]): Promise<CryptoKey> {
  const keyData = JSON.parse(keyString);
  
  const alg = algorithm === "AES-GCM" 
    ? { name: "AES-GCM" }
    : { name: "RSA-OAEP", hash: "SHA-256" };
    
  return await window.crypto.subtle.importKey(
    "jwk",
    keyData,
    alg,
    true,
    usage
  );
}

// Generate anonymous user ID
export function generateAnonymousId(): string {
  return 'anon_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}