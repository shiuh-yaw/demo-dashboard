/**
 * Normalize a base-URL value sourced from env config.
 *
 * Returns `undefined` for blank/missing values so an unset `DASHBOARD_API_URL`
 * is treated as "not configured" (a clean, catchable error) rather than
 * crashing `createEnv` validation at module load.
 *
 * Prepends `https://` when the scheme is missing — the most common deployment
 * misconfiguration (e.g. setting `dashboard.vercel.app` instead of
 * `https://dashboard.vercel.app`), which otherwise fails `z.string().url()`
 * and takes the whole route's serverless function down with a 500 HTML page.
 *
 * Also strips trailing slashes so callers can safely concatenate
 * `${baseUrl}${path}` where `path` begins with `/`.
 */
export function normalizeBaseUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  // Strip surrounding whitespace/newlines and any wrapping quotes — common
  // paste artifacts in dashboard env UIs that otherwise fail `.url()`.
  const cleaned = value.trim().replace(/^["']|["']$/g, "").trim();
  if (!cleaned) return undefined;
  const withScheme = /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;
  return withScheme.replace(/\/+$/, "");
}
