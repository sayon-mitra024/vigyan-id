import { ed25519 } from "@noble/curves/ed25519.js";
import { base58btc } from "multiformats/bases/base58";

/**
 * Real Ed25519 + did:key implementation.
 *
 * did:key encoding: multicodec varint prefix (0xed01 for Ed25519 public keys)
 * followed by the raw 32-byte public key, base58btc-encoded with a "z" prefix.
 * See https://w3c-ccg.github.io/did-method-key/#ed25519-x25519.
 */

const ED25519_MULTICODEC_PREFIX = new Uint8Array([0xed, 0x01]);

export type Ed25519KeyPair = {
  did: string;
  publicKeyMultibase: string;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
};

function toMultibase(publicKey: Uint8Array): string {
  const prefixed = new Uint8Array(ED25519_MULTICODEC_PREFIX.length + publicKey.length);
  prefixed.set(ED25519_MULTICODEC_PREFIX, 0);
  prefixed.set(publicKey, ED25519_MULTICODEC_PREFIX.length);
  return base58btc.encode(prefixed);
}

function fromMultibase(multibase: string): Uint8Array {
  const decoded = base58btc.decode(multibase);
  if (decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error("UNSUPPORTED_KEY_TYPE");
  }
  return decoded.slice(2);
}

/** Generates a real Ed25519 keypair and derives a deterministic did:key from the public key. */
export function generateEd25519KeyPair(): Ed25519KeyPair {
  const privateKey = ed25519.utils.randomSecretKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  const publicKeyMultibase = toMultibase(publicKey);
  return { did: `did:key:${publicKeyMultibase}`, publicKeyMultibase, publicKey, privateKey };
}

/** Derives the did:key identifier from a raw Ed25519 public key. */
export function didFromPublicKey(publicKey: Uint8Array): string {
  return `did:key:${toMultibase(publicKey)}`;
}

/** Extracts the raw Ed25519 public key bytes from a did:key identifier. */
export function publicKeyFromDid(did: string): Uint8Array {
  if (!did.startsWith("did:key:")) throw new Error("UNSUPPORTED_DID_METHOD");
  return fromMultibase(did.slice("did:key:".length));
}

export function signBytes(message: Uint8Array, privateKey: Uint8Array): Uint8Array {
  return ed25519.sign(message, privateKey);
}

export function verifyBytes(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
  try {
    return ed25519.verify(signature, message, publicKey);
  } catch {
    return false;
  }
}

export function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

export function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, "hex"));
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function base64UrlToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64url"));
}
