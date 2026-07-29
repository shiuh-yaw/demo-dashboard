import { describe, expect, it } from "vitest";

import { decryptSecret } from "../decrypt-secret";

describe("decryptSecret", () => {
  it("AES-GCM-decrypts a payload encrypted under the same key/iv", async () => {
    // Arrange: build a known ciphertext with WebCrypto (Node 20 exposes it).
    const secretKeyHex = "00112233445566778899aabbccddeeff";
    const keyBytes = Uint8Array.from(
      secretKeyHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM" },
      false,
      ["encrypt"],
    );
    const plaintext = "4242424242424242";
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      new TextEncoder().encode(plaintext),
    );
    const toB64 = (u: Uint8Array) => Buffer.from(u).toString("base64");

    // Act
    const out = await decryptSecret(
      toB64(new Uint8Array(ct)),
      toB64(iv),
      secretKeyHex,
    );

    // Assert
    expect(out).toBe(plaintext);
  });
});
