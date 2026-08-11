// Public, non-secret configuration. The Dynamic environment id is a public
// client identifier, safe to ship to the browser.
import { resolveCredentials } from "@dynamic-demos/dynamic/resolve-credentials";

import { env } from "./env";

// Resolved lazily: a module-scope const can latch the pre-hydration value.
let cachedEnvironmentId: string | undefined;

export function getDynamicEnvironmentId(): string {
  if (cachedEnvironmentId) return cachedEnvironmentId;
  try {
    cachedEnvironmentId = resolveCredentials({
      appEnvironmentId: env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    }).environmentId;
  } catch {
    // Not cached - a later call can still succeed.
    return "";
  }
  return cachedEnvironmentId;
}

// Resolved at call time in lib/redirect.ts, which needs
// `window.location.origin`.
export const DEFAULT_CALLBACK_PATH = "/callback";

// Allow-list of `http(s)` hosts accepted in `redirect_uri`, or null for
// permissive mode.
//
// Scheme validation is NOT an open-redirect control: `https://evil.example`
// satisfies every scheme rule we have. Only a host allow-list closes it, which
// is what upstream iframe-fb added in PR #28. Bare hostnames, comma-separated;
// port and case are ignored, and there are no wildcards - `example.com` does
// NOT match `sub.example.com`, so subdomains must be listed explicitly.
export const ALLOWED_REDIRECT_HOSTS: string[] | null = (() => {
  const configured = env.NEXT_PUBLIC_CONNECT_ALLOWED_REDIRECT_HOSTS;
  if (!configured) return null; // null = permissive (any host)
  const hosts = configured
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return hosts.length > 0 ? hosts : null;
})();

// Never allowed as a redirect target, and never overridable by the allow-list.
//
// Two families:
//   1. Script / data / local-file vectors, which can execute or read locally.
//   2. Authority-bearing schemes that hand off to ANOTHER app or a
//      browser-internal page. These are hierarchical and carry a host, so the
//      permissive branch in isRedirectAllowed would otherwise wave them
//      through - `intent://` in particular can launch an arbitrary Android
//      activity. Added to match upstream iframe-fb PR #27.
export const BLOCKED_REDIRECT_SCHEMES = [
  // 1. script / data / local file
  "javascript",
  "data",
  "vbscript",
  "file",
  "blob",
  "about",
  // 2. app / browser hand-off
  "intent",
  "android-app",
  "market",
  "content",
  "chrome",
  "chrome-extension",
  "ftp",
];

// Wallets to surface first, in this order. Matched case-insensitively against a
// provider's groupKey / key / display name so it survives Dynamic's naming.
export const FEATURED_WALLETS = ["metamask", "base", "okx", "phantom"] as const;

// How many rows the list shows before the user searches. Detected browser
// extensions are prepended ahead of FEATURED_WALLETS, so on a machine with
// several wallets installed the two sets together can exceed this - hence the
// hard cap rather than relying on the list lengths.
export const FEATURED_LIST_SIZE = 5;
