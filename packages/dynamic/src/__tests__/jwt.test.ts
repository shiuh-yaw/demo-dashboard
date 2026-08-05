/**
 * JWT verification against a multi-key JWKS.
 *
 * Dynamic rotates signing keys per environment, so a JWKS legitimately serves
 * more than one key. `jwks-rsa`'s `getSigningKey()` refuses to guess when it
 * has several ("No KID specified and JWKS endpoint returned more than 1 key"),
 * so the token's own `kid` header has to select the key. Verifying without it
 * worked only for as long as every environment had exactly one key, and broke
 * every server-side session check the moment one rotated.
 *
 * The token here is signed by the SECOND key on purpose - picking the first
 * key unconditionally also passes a single-key test but fails in production.
 */

import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

function keypair() {
  return generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
}

const KEY_A = { kid: "kid-a", ...keypair() };
const KEY_B = { kid: "kid-b", ...keypair() };

/** Replicates jwks-rsa@3's real no-kid behaviour (JwksClient.js:74). */
let served: Array<typeof KEY_A> = [];
const getSigningKey = vi.fn(async (kid?: string) => {
  if (!kid && served.length > 1) {
    throw new Error(
      "No KID specified and JWKS endpoint returned more than 1 key",
    );
  }
  const match = kid ? served.find((k) => k.kid === kid) : served[0];
  if (!match) throw new Error("Unable to find a signing key that matches");
  return { getPublicKey: () => match.publicKey };
});

vi.mock("jwks-rsa", () => ({
  JwksClient: class {
    getSigningKey = getSigningKey;
    getSigningKeys = async () => served;
  },
}));

const { verifyDynamicJWT } = await import("../jwt");

function sign(key: typeof KEY_A, payload: Record<string, unknown> = {}) {
  return jwt.sign({ sub: "user-1", ...payload }, key.privateKey, {
    algorithm: "RS256",
    keyid: key.kid,
    expiresIn: "1h",
  });
}

let env = 0;
/** Fresh env id per test - the module memoises a client per environment. */
const nextEnv = () => `env-${++env}`;

describe("verifyDynamicJWT", () => {
  beforeEach(() => {
    getSigningKey.mockClear();
  });

  it("verifies a token when the JWKS serves several keys", async () => {
    served = [KEY_A, KEY_B];

    const payload = await verifyDynamicJWT(sign(KEY_B), nextEnv());

    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("user-1");
  });

  it("selects the signing key by the token's kid", async () => {
    served = [KEY_A, KEY_B];

    await verifyDynamicJWT(sign(KEY_B), nextEnv());

    expect(getSigningKey).toHaveBeenCalledWith(KEY_B.kid);
  });

  it("still verifies when the JWKS serves a single key", async () => {
    served = [KEY_A];

    const payload = await verifyDynamicJWT(sign(KEY_A), nextEnv());

    expect(payload?.sub).toBe("user-1");
  });

  it("returns null for a token signed by a key the JWKS does not serve", async () => {
    served = [KEY_A];

    expect(await verifyDynamicJWT(sign(KEY_B), nextEnv())).toBeNull();
  });

  it("returns null for a malformed token", async () => {
    served = [KEY_A, KEY_B];

    expect(await verifyDynamicJWT("not-a-jwt", nextEnv())).toBeNull();
  });
});
