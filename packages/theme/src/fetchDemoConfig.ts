/**
 * fetchDemoConfig — server-side demo config fetcher (D-008).
 *
 * Reads the resolved config id (sourced from `x-<demoType>-config-id`
 * forwarded by `createDemoMiddleware`), fetches the persisted record from
 * the dashboard API, and returns the result merged over a sane fallback.
 *
 * Failure modes are intentionally lenient:
 * - `id == null` → return `fallback` (no fetch attempted).
 * - HTTP failure / non-2xx → log and return `fallback`.
 * - Malformed JSON → log and return `fallback`.
 *
 * Demos must keep rendering even when the dashboard is unreachable, so
 * this helper never throws. Callers handle "no config" by relying on the
 * fallback's defaults.
 */

export interface FetchDemoConfigOpts<T> {
  /** Demo type slug — matches `createDemoMiddleware`'s `demoType` (e.g. "remittance"). */
  demoType: string;
  /** Config id from the forwarded header, or `null` when not set. */
  id: string | null | undefined;
  /** Fallback config returned when no id is set or the fetch fails. */
  fallback: T;
  /**
   * Override the dashboard base URL. When omitted, the helper resolves
   * one of (in priority order): `DASHBOARD_URL`,
   * `NEXT_PUBLIC_DASHBOARD_URL`, `NEXT_PUBLIC_DASHBOARD_API_URL`,
   * `NEXT_PUBLIC_API_BASE_URL`. The last two are compat aliases for the
   * env names the per-app fetchers shipped with — apps don't need to
   * rename their existing variables. When none are set, the helper logs
   * a warning and returns `fallback`.
   */
  dashboardUrl?: string;
  /** Override `fetch` for tests. */
  fetchImpl?: typeof fetch;
  /** Override the logger (defaults to `console`). */
  logger?: { warn: (msg: string, ...args: unknown[]) => void };
}

const DEFAULT_LOGGER = {
  warn: (msg: string, ...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.warn(msg, ...args);
  },
};

export async function fetchDemoConfig<T>(opts: FetchDemoConfigOpts<T>): Promise<T> {
  const {
    demoType,
    id,
    fallback,
    dashboardUrl,
    fetchImpl,
    logger = DEFAULT_LOGGER,
  } = opts;

  if (id == null || id === "") {
    return fallback;
  }

  const baseUrl = resolveDashboardUrl(dashboardUrl);
  if (!baseUrl) {
    logger.warn(
      "[fetchDemoConfig] no DASHBOARD_URL set; falling back to defaults",
      { demoType, id },
    );
    return fallback;
  }

  const fetcher: typeof fetch = fetchImpl ?? globalThis.fetch;
  if (!fetcher) {
    logger.warn(
      "[fetchDemoConfig] no fetch implementation available; falling back to defaults",
    );
    return fallback;
  }

  const url = `${baseUrl.replace(/\/$/, "")}/api/demo-configs/${encodeURIComponent(
    demoType,
  )}/${encodeURIComponent(id)}`;

  try {
    const res = await fetcher(url, {
      method: "GET",
      headers: { accept: "application/json" },
      // Per Next.js 15: avoid caching to keep config edits visible immediately.
      cache: "no-store",
    });
    if (!res.ok) {
      logger.warn(
        `[fetchDemoConfig] non-2xx fetching demo config; falling back`,
        { demoType, id, status: res.status, url },
      );
      return fallback;
    }
    const raw = (await res.json()) as unknown;
    const data = unwrapEnvelope<T>(raw);
    return mergeOverFallback(fallback, data);
  } catch (err) {
    logger.warn(`[fetchDemoConfig] fetch threw; falling back`, {
      demoType,
      id,
      url,
      err,
    });
    return fallback;
  }
}

function resolveDashboardUrl(explicit?: string): string | undefined {
  if (explicit) return explicit;
  // Process.env can be undefined in some edge runtimes; guard accordingly.
  if (typeof process === "undefined" || !process.env) return undefined;
  // Checked in priority order. The first two are the documented contract;
  // the last two are compat with the env-var names the per-app fetchers
  // shipped with (NEXT_PUBLIC_DASHBOARD_API_URL for checkouts/wallet/shop,
  // NEXT_PUBLIC_API_BASE_URL for earn/remittance/trade) — keeping those
  // working means no app `.env.local` edits are required to migrate.
  return (
    process.env.DASHBOARD_URL ??
    process.env.NEXT_PUBLIC_DASHBOARD_URL ??
    process.env.NEXT_PUBLIC_DASHBOARD_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL
  );
}

/**
 * The dashboard's `createResponse` helper wraps every successful payload
 * in `{ success: true, data: <T> }`. Detect that shape and pull the
 * inner `data` out; pass anything else through unchanged so consumers
 * that point this client at a different shape still work.
 */
function unwrapEnvelope<T>(raw: unknown): Partial<T> | T {
  if (
    raw != null &&
    typeof raw === "object" &&
    "success" in raw &&
    (raw as { success: unknown }).success === true &&
    "data" in raw
  ) {
    return (raw as { data: Partial<T> | T }).data;
  }
  return raw as Partial<T> | T;
}

/**
 * Shallow-merge fetched data over the fallback. We deliberately don't deep-
 * merge: dashboards return a full config record, and partial records are
 * normalized to full records server-side. This shallow merge guarantees
 * `theme`/`branding` fields are replaced atomically.
 *
 * If the fetched payload lacks a top-level field, the fallback's value is
 * preserved. This keeps demos resilient against partial dashboard schemas.
 */
function mergeOverFallback<T>(fallback: T, data: Partial<T> | T): T {
  if (data == null || typeof data !== "object") return fallback;
  return { ...(fallback as object), ...(data as object) } as T;
}
