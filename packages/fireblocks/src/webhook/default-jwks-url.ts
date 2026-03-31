/**
 * JWKS hosts for webhook signature verification by workspace region.
 *
 * @see https://developers.fireblocks.com/reference/validating-webhooks#validating-webhooks-jwks
 */
export function defaultFireblocksWebhookJwksUrl(
  fireblocksApiBaseUrl: string | undefined,
): string {
  const base = fireblocksApiBaseUrl ?? "";
  if (/sandbox/i.test(base)) {
    return "https://sandbox-keys.fireblocks.io/.well-known/jwks.json";
  }
  return "https://keys.fireblocks.io/.well-known/jwks.json";
}

export function resolveFireblocksWebhookJwksUrl(options: {
  jwksUrl?: string;
  fireblocksApiBaseUrl?: string;
}): string {
  if (options.jwksUrl) return options.jwksUrl;
  return defaultFireblocksWebhookJwksUrl(options.fireblocksApiBaseUrl);
}
