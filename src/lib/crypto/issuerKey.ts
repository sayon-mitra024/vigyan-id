import { ed25519 } from "@noble/curves/ed25519.js";
import { didFromPublicKey, hexToBytes } from "./ed25519";
import { firebaseAdminConfigured } from "@/lib/firebase/admin";

/**
 * Resolves the institution's Ed25519 issuer signing key.
 *
 * The private key is a SERVER-ONLY SECRET (an environment variable, i.e. the deployment's
 * equivalent of an HSM/KMS-held key) and is NEVER written to Firestore, NEVER sent to the
 * client, and NEVER logged. Firestore only ever stores the resulting DID and public key.
 *
 * DEMO_ISSUER_PRIVATE_KEY_HEX is a fixed, publicly-known development key used only when
 * Firebase Admin is not configured (demo mode). It must never be used as a production
 * issuer key — if Firebase Admin IS configured but no real issuer key is set, issuance
 * fails loudly instead of silently signing with the demo key.
 */
const DEMO_ISSUER_PRIVATE_KEY_HEX = "4c0e2c5a1b7d9f3e6a8c2d4f10b5e7a9c3d6f8e1a2b4c6d8e0f1a3b5c7d9e1f3";

export type IssuerKey = { did: string; privateKey: Uint8Array; publicKey: Uint8Array; source: "env" | "demo" };

export function getInstitutionIssuerKey(): IssuerKey {
  const configuredHex = process.env.ISSUER_ED25519_PRIVATE_KEY_HEX;
  if (configuredHex) {
    const privateKey = hexToBytes(configuredHex);
    const publicKey = ed25519.getPublicKey(privateKey);
    return { did: didFromPublicKey(publicKey), privateKey, publicKey, source: "env" };
  }
  if (firebaseAdminConfigured) {
    throw new Error("ISSUER_KEY_NOT_CONFIGURED");
  }
  const privateKey = hexToBytes(DEMO_ISSUER_PRIVATE_KEY_HEX);
  const publicKey = ed25519.getPublicKey(privateKey);
  return { did: didFromPublicKey(publicKey), privateKey, publicKey, source: "demo" };
}
