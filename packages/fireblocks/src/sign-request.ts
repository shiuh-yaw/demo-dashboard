/**
 * Shared Fireblocks request-signing helper.
 *
 * Used by `orders.ts` (Trading Orders API) and `api.ts` (raw REST
 * escape hatch). Both follow Fireblocks's "sign each request" auth
 * model: RS256 JWT with the request path, a SHA-256 hash of the body,
 * a per-request nonce, and a short expiry.
 *
 * @see https://developers.fireblocks.com/reference/signing-a-request
 */

import { createHash, randomUUID } from "node:crypto";
import { SignJWT, importPKCS8 } from "jose";

export interface SignFireblocksRequestInput {
  /** PEM-encoded RSA private key (PKCS#8). */
  secretKey: string;
  /** Fireblocks API key UUID. */
  apiKey: string;
  /** HTTP method — verb-agnostic in the JWT, but informs body presence. */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Request path + query string (e.g. `/v1/vault/accounts?limit=50`). */
  path: string;
  /** Raw body bytes for SHA-256. Omit for verbs without a body. */
  bodyBuffer?: Buffer;
}

export interface SignedFireblocksRequest {
  /** Bearer-style JWT. */
  token: string;
  /** Hex SHA-256 of the body (empty-string hash if no body). */
  bodyHash: string;
}

const JWT_TTL_SECONDS = 30;

export async function signFireblocksRequest(
  input: SignFireblocksRequestInput,
): Promise<SignedFireblocksRequest> {
  const { secretKey, apiKey, path, bodyBuffer } = input;
  const bodyHash = createHash("sha256")
    .update(bodyBuffer ?? Buffer.alloc(0))
    .digest("hex");
  const now = Math.floor(Date.now() / 1000);

  const key = await importPKCS8(secretKey, "RS256");
  const token = await new SignJWT({
    uri: path,
    nonce: randomUUID(),
    iat: now,
    exp: now + JWT_TTL_SECONDS,
    sub: apiKey,
    bodyHash,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(key);

  return { token, bodyHash };
}
