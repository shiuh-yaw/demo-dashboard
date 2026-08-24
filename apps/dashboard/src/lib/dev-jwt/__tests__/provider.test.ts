import { exportJWK, generateKeyPair, importJWK, jwtVerify } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  env: {
    JWT_PROVIDER_KID: undefined as string | undefined,
    JWT_PROVIDER_ISSUER: undefined as string | undefined,
    JWT_PROVIDER_PUBLIC_KEY: undefined as string | undefined,
    JWT_PROVIDER_PRIVATE_KEY: undefined as string | undefined,
  },
}));
vi.mock("@/env", () => envMock);

import { readDevJwtProvider, signDevJwt } from "../provider";

const KID = "demo-key-test";
const ISSUER = "https://demo-jwt-provider.example.com";

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256", {
    extractable: true,
  });
  const meta = { kid: KID, use: "sig", alg: "RS256" };
  envMock.env.JWT_PROVIDER_KID = KID;
  envMock.env.JWT_PROVIDER_ISSUER = ISSUER;
  envMock.env.JWT_PROVIDER_PUBLIC_KEY = JSON.stringify({
    ...(await exportJWK(publicKey)),
    ...meta,
  });
  envMock.env.JWT_PROVIDER_PRIVATE_KEY = JSON.stringify({
    ...(await exportJWK(privateKey)),
    ...meta,
  });
});

describe("readDevJwtProvider", () => {
  it("is null when a piece is missing, so the route answers 501 not 500", () => {
    const kid = envMock.env.JWT_PROVIDER_KID;
    envMock.env.JWT_PROVIDER_KID = undefined;
    expect(readDevJwtProvider()).toBeNull();
    envMock.env.JWT_PROVIDER_KID = kid;
  });

  it("is null on unparseable key material rather than throwing", () => {
    const key = envMock.env.JWT_PROVIDER_PUBLIC_KEY;
    envMock.env.JWT_PROVIDER_PUBLIC_KEY = "not json";
    expect(readDevJwtProvider()).toBeNull();
    envMock.env.JWT_PROVIDER_PUBLIC_KEY = key;
  });

  it("never carries the private half on the key it publishes", () => {
    expect(readDevJwtProvider()?.publicJwk.d).toBeUndefined();
  });
});

describe("signDevJwt", () => {
  it("verifies against the published key, which is the whole contract", async () => {
    const provider = readDevJwtProvider();
    if (!provider) throw new Error("provider not configured");

    const token = await signDevJwt({
      provider,
      sub: "user-123",
      email: "user@example.com",
    });

    // Exactly what Dynamic does: read the JWKS, find the key by `kid`, verify.
    const { payload, protectedHeader } = await jwtVerify(
      token,
      await importJWK(provider.publicJwk, "RS256"),
      { issuer: ISSUER },
    );

    expect(protectedHeader.kid).toBe(KID);
    expect(payload.sub).toBe("user-123");
    expect(payload.email).toBe("user@example.com");
    expect(payload.emailVerified).toBe(true);
    expect(payload.exp).toBeGreaterThan(payload.iat as number);
  });

  it("omits the email claims when no email is given", async () => {
    const provider = readDevJwtProvider();
    if (!provider) throw new Error("provider not configured");

    const token = await signDevJwt({ provider, sub: "user-123" });
    const { payload } = await jwtVerify(
      token,
      await importJWK(provider.publicJwk, "RS256"),
    );

    expect(payload.email).toBeUndefined();
    expect(payload.emailVerified).toBeUndefined();
  });
});
