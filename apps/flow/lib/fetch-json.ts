/**
 * fetch + defensive JSON parse for client-side calls to our own API routes.
 *
 * A serverless function that crashes (e.g. an env-validation throw at module
 * load) returns Next.js's 500 *HTML* error page, not JSON. Calling
 * `res.json()` on that throws the cryptic `Unexpected token '<'`, hiding the
 * real status. This helper never throws on a non-JSON body: it surfaces the
 * HTTP status and any structured `error` message (or a short snippet) so
 * callers can show an actionable message instead.
 */
export interface JsonResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<JsonResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (e) {
    // Network-level failure (DNS, offline, CORS) — never reached the server.
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : "Network request failed",
    };
  }

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    // Non-JSON body — an HTML error page, proxy/gateway error, etc.
    const snippet = text.slice(0, 120).replace(/\s+/g, " ").trim();
    return {
      ok: false,
      status: res.status,
      error: `Request failed (${res.status})${snippet ? `: ${snippet}` : ""}`,
    };
  }

  const obj = (parsed ?? {}) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error:
        typeof obj.error === "string"
          ? obj.error
          : `Request failed (${res.status})`,
    };
  }

  return { ok: true, status: res.status, data: obj as T };
}
