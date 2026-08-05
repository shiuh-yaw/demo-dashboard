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
   * `NEXT_PUBLIC_API_BASE_URL`, `DASHBOARD_API_URL`; outside production it then
   * falls back to `http://localhost:4000`. The last two are compat aliases for the
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

/** Where `pnpm dev` serves apps/dashboard. */
const DEV_DASHBOARD_URL = "http://localhost:4000";

const DEFAULT_LOGGER = {
  warn: (msg: string, ...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.warn(msg, ...args);
  },
};

/**
 * A config plus whether it came from the dashboard.
 *
 * `resolved: false` means the returned config IS the fallback - no id, no
 * dashboard URL, or the fetch failed. Callers deciding branded-vs-unbranded
 * chrome must key off this rather than off the presence of a config id: the
 * cookie says "a brand was requested", only this says "we got it". Deriving
 * branding from the id renders branded chrome over an unbranded page, which is
 * a misleading failure instead of an obvious one.
 */
export interface DemoConfigResult<T> {
  config: T;
  resolved: boolean;
}

/**
 * As `fetchDemoConfig`, but reports whether the config actually resolved.
 * Same lenient failure modes - never throws.
 */
export async function fetchDemoConfigResult<T>(
  opts: FetchDemoConfigOpts<T>,
): Promise<DemoConfigResult<T>> {
  const {
    demoType,
    id,
    fallback,
    dashboardUrl,
    fetchImpl,
    logger = DEFAULT_LOGGER,
  } = opts;

  const unresolved: DemoConfigResult<T> = { config: fallback, resolved: false };

  if (id == null || id === "") {
    return unresolved;
  }

  const baseUrl = resolveDashboardUrl(dashboardUrl);
  if (!baseUrl) {
    logger.warn(
      "[fetchDemoConfig] no dashboard URL set (and not in dev); falling back to defaults",
      { demoType, id },
    );
    return unresolved;
  }

  const fetcher: typeof fetch = fetchImpl ?? globalThis.fetch;
  if (!fetcher) {
    logger.warn(
      "[fetchDemoConfig] no fetch implementation available; falling back to defaults",
    );
    return unresolved;
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
      return unresolved;
    }
    const raw = (await res.json()) as unknown;
    const data = unwrapEnvelope<T>(raw);
    if (data == null || typeof data !== "object") {
      logger.warn(`[fetchDemoConfig] payload was not an object; falling back`, {
        demoType,
        id,
        url,
      });
      return unresolved;
    }
    // Deliberately shallow, not deep: the dashboard returns a full config
    // record (partials are normalized server-side), and a shallow merge
    // guarantees `theme`/`branding` are replaced atomically. A fetched payload
    // missing a top-level field keeps the fallback's value, which keeps demos
    // resilient against partial dashboard schemas.
    return {
      config: { ...(fallback as object), ...(data as object) } as T,
      resolved: true,
    };
  } catch (err) {
    logger.warn(`[fetchDemoConfig] fetch threw; falling back`, {
      demoType,
      id,
      url,
      err,
    });
    return unresolved;
  }
}

export async function fetchDemoConfig<T>(opts: FetchDemoConfigOpts<T>): Promise<T> {
  return (await fetchDemoConfigResult(opts)).config;
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
  const configured =
    process.env.DASHBOARD_URL ??
    process.env.NEXT_PUBLIC_DASHBOARD_URL ??
    process.env.NEXT_PUBLIC_DASHBOARD_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    // A fifth name, because two apps ship it (connect, flow) and its absence
    // from this list is exactly the bug below: the var looked set, the fetch
    // never happened.
    process.env.DASHBOARD_API_URL;
  if (configured) return configured;

  // Outside production, assume the dashboard is running where `pnpm dev` puts
  // it. Every app previously had to name the URL itself, and any app that
  // named it with a key not on this list silently rendered the DEFAULT palette
  // while still believing it was branded - `isBranded` comes from the theme
  // cookie, not from this fetch, so the chrome went branded over an unbranded
  // page. A local default costs nothing and removes the whole class of it.
  // Production is left strict: guessing localhost there would hide a real
  // misconfiguration behind a connection error.
  if (process.env.NODE_ENV !== "production") return DEV_DASHBOARD_URL;
  return undefined;
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
