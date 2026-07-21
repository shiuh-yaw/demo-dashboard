/**
 * Fetches the public share context (prospect display name + book-a-call CTA)
 * for a `dd_share` token from the dashboard's context endpoint (Phase 05,
 * `GET /api/share/context`).
 *
 * Fail-silent by construction: any failure - missing env, network error,
 * timeout, non-200, unparsable JSON - resolves to `{}`. Callers (the CTA
 * component) treat an empty object as "render nothing."
 */

export interface ShareContext {
  prospectName?: string;
  cta?: { label: string; url: string };
}

const TIMEOUT_MS = 3000;

function resolveTrackBaseUrl(): string | undefined {
  try {
    return process.env.NEXT_PUBLIC_TRACK_URL || undefined;
  } catch {
    return undefined;
  }
}

/**
 * `GET ${NEXT_PUBLIC_TRACK_URL}/api/share/context?token=...`. Resolves `{}`
 * on any failure (no token, no configured base URL, network error, timeout,
 * non-200, or invalid JSON). Never throws.
 */
export async function getShareContext(
  token: string | undefined,
): Promise<ShareContext> {
  try {
    if (!token) return {};
    const baseUrl = resolveTrackBaseUrl();
    if (!baseUrl) return {};

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const url = `${baseUrl.replace(/\/$/, "")}/api/share/context?token=${encodeURIComponent(token)}`;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return {};

      const data: unknown = await response.json();
      if (!data || typeof data !== "object") return {};

      const result: ShareContext = {};
      const record = data as Record<string, unknown>;
      if (typeof record.prospectName === "string") {
        result.prospectName = record.prospectName;
      }
      if (
        record.cta &&
        typeof record.cta === "object" &&
        typeof (record.cta as Record<string, unknown>).label === "string" &&
        typeof (record.cta as Record<string, unknown>).url === "string"
      ) {
        const cta = record.cta as Record<string, unknown>;
        result.cta = { label: cta.label as string, url: cta.url as string };
      }
      return result;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return {};
  }
}
