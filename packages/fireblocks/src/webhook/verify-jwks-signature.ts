import { compactVerify, createRemoteJWKSet } from "jose";

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getRemoteJwkSet(jwksUrl: string) {
  let set = jwksCache.get(jwksUrl);
  if (!set) {
    set = createRemoteJWKSet(new URL(jwksUrl));
    jwksCache.set(jwksUrl, set);
  }
  return set;
}

function stripDetachedJwsWrapper(value: string): string {
  const t = value.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"'))
    return t.slice(1, -1);
  return t;
}

/**
 * Verifies `Fireblocks-Webhook-Signature`: detached JWS `header..signature` with the
 * raw body as the signed payload (base64url), per Fireblocks JWKS docs.
 */
export async function verifyFireblocksWebhookJwksSignature(
  rawBody: string,
  fireblocksWebhookSignatureHeader: string,
  jwksUrl: string,
): Promise<boolean> {
  try {
    const detached = stripDetachedJwsWrapper(fireblocksWebhookSignatureHeader);
    const parts = detached.split(".");
    if (parts.length !== 3 || parts[1] !== "") return false;

    const [header, , sig] = parts;
    const payload = Buffer.from(rawBody, "utf8").toString("base64url");
    const compactJws = `${header}.${payload}.${sig}`;

    await compactVerify(compactJws, getRemoteJwkSet(jwksUrl));
    return true;
  } catch (err) {
    console.error(
      "[@dynamic-demos/fireblocks] JWKS webhook verification failed",
      err,
    );
    return false;
  }
}
