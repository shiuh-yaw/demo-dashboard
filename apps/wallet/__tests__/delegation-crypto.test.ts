import { describe, expect, it } from "vitest";
import crypto from "crypto";

import {
  normalizePrivateKeyPem,
  openMaterial,
  sealMaterial,
} from "../lib/delegation/crypto";

const KEY = crypto.randomBytes(32).toString("base64");

describe("delegation crypto", () => {
  it("round-trips a payload", () => {
    const plaintext = JSON.stringify({ share: "abc", n: 1 });
    expect(openMaterial(sealMaterial(plaintext, KEY), KEY)).toBe(plaintext);
  });

  it("uses a fresh IV per call, so identical inputs differ", () => {
    const a = sealMaterial("same", KEY);
    const b = sealMaterial("same", KEY);
    expect(a).not.toBe(b);
    expect(a.split(".")[1]).not.toBe(b.split(".")[1]);
    expect(openMaterial(a, KEY)).toBe("same");
    expect(openMaterial(b, KEY)).toBe("same");
  });

  it("rejects a tampered ciphertext rather than returning plaintext", () => {
    const sealed = sealMaterial("secret", KEY);
    const [v, iv, tag, ct] = sealed.split(".");
    const flipped = Buffer.from(ct!, "base64url");
    flipped.writeUInt8(flipped[0]! ^ 0xff, 0);
    const tampered = [v, iv, tag, flipped.toString("base64url")].join(".");
    expect(() => openMaterial(tampered, KEY)).toThrow();
  });

  it("rejects the wrong key", () => {
    const sealed = sealMaterial("secret", KEY);
    expect(() =>
      openMaterial(sealed, crypto.randomBytes(32).toString("base64")),
    ).toThrow();
  });

  it("rejects a key that is not 32 bytes", () => {
    expect(() =>
      sealMaterial("x", crypto.randomBytes(16).toString("base64")),
    ).toThrow(/32 base64-encoded bytes/);
  });

  it("rejects a malformed envelope", () => {
    expect(() => openMaterial("nonsense", KEY)).toThrow(/Malformed/);
  });
});

describe("normalizePrivateKeyPem", () => {
  const pem = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----";

  it("passes raw PEM through", () => {
    expect(normalizePrivateKeyPem(pem)).toBe(pem);
  });

  it("decodes base64-wrapped PEM, which is how it survives a .env file", () => {
    const b64 = Buffer.from(pem, "utf8").toString("base64");
    expect(normalizePrivateKeyPem(b64)).toBe(pem);
  });
});
