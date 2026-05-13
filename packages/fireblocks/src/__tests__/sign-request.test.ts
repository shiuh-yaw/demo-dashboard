import { describe, expect, it } from "vitest";
import { jwtVerify, importSPKI } from "jose";
import { generateKeyPairSync, createHash } from "node:crypto";
import { signFireblocksRequest } from "../sign-request";

function generateTestKeypair() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  return { privateKeyPem: privateKey, publicKeyPem: publicKey };
}

describe("signFireblocksRequest", () => {
  const { privateKeyPem, publicKeyPem } = generateTestKeypair();
  const apiKey = "test-api-key-uuid";

  it("returns a JWT with the expected claims for a GET request (no body)", async () => {
    const signed = await signFireblocksRequest({
      secretKey: privateKeyPem,
      apiKey,
      method: "GET",
      path: "/v1/vault/accounts",
    });

    const publicKey = await importSPKI(publicKeyPem, "RS256");
    const { payload } = await jwtVerify(signed.token, publicKey);
    expect(payload.uri).toBe("/v1/vault/accounts");
    expect(payload.sub).toBe(apiKey);
    expect(payload.bodyHash).toBe(createHash("sha256").update("").digest("hex"));
    expect(typeof payload.nonce).toBe("string");
    expect(typeof payload.iat).toBe("number");
    expect(typeof payload.exp).toBe("number");
    expect((payload.exp as number) - (payload.iat as number)).toBe(30);
    expect(signed.bodyHash).toBe(payload.bodyHash);
  });

  it("hashes the body for POST requests", async () => {
    const body = { foo: "bar", n: 42 };
    const expectedHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
    const signed = await signFireblocksRequest({
      secretKey: privateKeyPem,
      apiKey,
      method: "POST",
      path: "/v1/transactions",
      bodyBuffer: Buffer.from(JSON.stringify(body)),
    });

    expect(signed.bodyHash).toBe(expectedHash);

    const publicKey = await importSPKI(publicKeyPem, "RS256");
    const { payload } = await jwtVerify(signed.token, publicKey);
    expect(payload.bodyHash).toBe(expectedHash);
  });

  it("generates a unique nonce per call", async () => {
    const a = await signFireblocksRequest({ secretKey: privateKeyPem, apiKey, method: "GET", path: "/v1/x" });
    const b = await signFireblocksRequest({ secretKey: privateKeyPem, apiKey, method: "GET", path: "/v1/x" });
    const publicKey = await importSPKI(publicKeyPem, "RS256");
    const { payload: pa } = await jwtVerify(a.token, publicKey);
    const { payload: pb } = await jwtVerify(b.token, publicKey);
    expect(pa.nonce).not.toBe(pb.nonce);
  });
});
