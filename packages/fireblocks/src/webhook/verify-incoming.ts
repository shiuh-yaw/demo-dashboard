import { resolveFireblocksWebhookJwksUrl } from "./default-jwks-url";
import { verifyFireblocksWebhookJwksSignature } from "./verify-jwks-signature";
import { verifyFireblocksWebhookLegacySignature } from "./verify-legacy-signature";

export type VerifyIncomingFireblocksWebhookOptions = {
  /** Full JWKS URL; if omitted, derived from `fireblocksApiBaseUrl` (sandbox vs US prod). */
  jwksUrl?: string;
  fireblocksApiBaseUrl?: string;
  /** PEM public key for legacy `Fireblocks-Signature` / `x-fireblocks-signature`. */
  legacyPublicKeyPem?: string;
};

/**
 * Verifies an incoming Fireblocks webhook request.
 *
 * Order: prefer JWKS (`fireblocks-webhook-signature`) when present; else legacy RSA
 * when a legacy header and PEM are configured. If neither mode is configured, accepts
 * unsigned requests (useful for local development).
 */
export async function verifyIncomingFireblocksWebhook(
  body: string,
  headers: Headers,
  options: VerifyIncomingFireblocksWebhookOptions,
): Promise<boolean> {
  const jwksHeader = headers.get("fireblocks-webhook-signature")?.trim();
  if (jwksHeader) {
    const jwksUrl = resolveFireblocksWebhookJwksUrl({
      jwksUrl: options.jwksUrl,
      fireblocksApiBaseUrl: options.fireblocksApiBaseUrl,
    });
    return verifyFireblocksWebhookJwksSignature(body, jwksHeader, jwksUrl);
  }

  const legacyHeader =
    headers.get("fireblocks-signature")?.trim() ||
    headers.get("x-fireblocks-signature")?.trim() ||
    "";

  const legacyPem = options.legacyPublicKeyPem;

  if (legacyHeader && legacyPem) {
    return verifyFireblocksWebhookLegacySignature(
      body,
      legacyHeader,
      legacyPem,
    );
  }

  if (legacyHeader && !legacyPem) {
    console.warn(
      "[@dynamic-demos/fireblocks] Legacy webhook signature header set but legacyPublicKeyPem omitted — skipping verification",
    );
    return true;
  }

  if (legacyPem) return false;
  return true;
}
