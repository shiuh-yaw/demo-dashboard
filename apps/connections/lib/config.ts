// Public, non-secret configuration. The Dynamic environment ID is a public
// client identifier (safe to ship to the browser); it is still read from an env
// var so it is not hard-coded across environments. `resolveCredentials()` owns
// the per-app → workspace-default fallback chain (D-003), so this module reads
// the resolved value rather than the raw env var.
import { resolveCredentials } from "@dynamic-demos/dynamic/resolve-credentials";

import { env } from "./env";

export const DYNAMIC_ENVIRONMENT_ID = (() => {
  try {
    return resolveCredentials().environmentId;
  } catch {
    // resolveCredentials throws when neither the per-app nor the workspace
    // default env id is set. The flow renders a "missing configuration" notice
    // for the empty string, which is a better failure than a boot crash.
    return "";
  }
})();

// Where we redirect after a successful connection when no `redirect_uri` is
// supplied. Undefined means the same-origin `/callback` page - resolved at call
// time in lib/redirect.ts, since it needs `window.location.origin`. Set your
// real callback endpoint via env before going live.
export const REDIRECT_BASE_URL: string | undefined =
  env.NEXT_PUBLIC_CONNECT_REDIRECT_BASE_URL;

// Same-origin stand-in for an integrator's callback endpoint.
export const DEFAULT_CALLBACK_PATH = "/callback";

// How we validate the scheme of a caller-supplied `redirect_uri`.
//
// Default (no env set): accept `http(s)` and ANY custom app scheme, so a native
// host can use its own scheme (`fbconnectdemo://`, `myapp://`, …) WITHOUT us
// hard-coding it here - only the genuinely dangerous schemes below are refused.
// A custom scheme just hands off to an app registered for it on the device; it
// can't phish on a web page or run script, so it's safe to allow openly. (An
// `http(s)` target to an arbitrary host is the real open-redirect surface - a
// deployment exposed publicly should additionally allow-list permitted hosts.)
//
// Locked-down deployments set NEXT_PUBLIC_CONNECT_ALLOWED_REDIRECT_SCHEMES
// (comma-separated) to switch to a strict allow-list instead.
export const ALLOWED_REDIRECT_SCHEMES: string[] | null = (() => {
  const configured = env.NEXT_PUBLIC_CONNECT_ALLOWED_REDIRECT_SCHEMES;
  if (!configured) return null; // null = permissive (block-list) mode
  return configured
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
})();

// Never allowed as a redirect target - script / data / local-file vectors.
export const BLOCKED_REDIRECT_SCHEMES = [
  "javascript",
  "data",
  "vbscript",
  "file",
  "blob",
  "about",
];

// Wallets to surface first, in this order. Matched case-insensitively against a
// provider's groupKey / key / display name so it survives Dynamic's naming.
export const FEATURED_WALLETS = ["metamask", "base", "okx", "phantom"] as const;

// How many rows the list shows before the user searches. Detected browser
// extensions are prepended ahead of FEATURED_WALLETS, so on a machine with
// several wallets installed the two sets together can exceed this - hence the
// hard cap rather than relying on the list lengths.
export const FEATURED_LIST_SIZE = 5;
