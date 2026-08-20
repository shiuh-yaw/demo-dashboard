/**
 * AES-256-GCM envelope for delegated access materials at rest.
 *
 * Dynamic delivers the delegated share and per-wallet API key RSA-encrypted to
 * our public key; we decrypt with the RSA private key and immediately re-encrypt
 * under `DELEGATION_ENC_KEY` before anything reaches Redis. Plaintext exists
 * only inside a single request.
 */

import crypto from "crypto";

/** `v1.<iv>.<tag>.<ciphertext>`, all base64url. Versioned so the format can rotate. */
const FORMAT = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;

function encryptionKey(rawKey: string): Buffer {
  const key = Buffer.from(rawKey, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `DELEGATION_ENC_KEY must be ${KEY_BYTES} base64-encoded bytes, got ${key.length}`,
    );
  }
  return key;
}

/**
 * Accept the RSA key either as raw PEM or base64-encoded PEM. Multi-line PEM in
 * a .env file is a common source of silent breakage, so base64 is the sane way
 * to carry it; raw still works for anyone who quotes it properly.
 */
export function normalizePrivateKeyPem(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("-----BEGIN")) return trimmed;
  return Buffer.from(trimmed, "base64").toString("utf8");
}

/** Encrypt with a fresh IV. Never reuse an IV under the same key. */
export function sealMaterial(plaintext: string, rawKey: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(rawKey), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    FORMAT,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

/** Reverse of `sealMaterial`. Throws if the tag fails - never returns partial plaintext. */
export function openMaterial(sealed: string, rawKey: string): string {
  const [format, iv, tag, ciphertext] = sealed.split(".");
  if (format !== FORMAT || !iv || !tag || !ciphertext) {
    throw new Error("Malformed sealed delegation material");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(rawKey),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
