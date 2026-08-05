import {
  ALLOWED_REDIRECT_SCHEMES,
  BLOCKED_REDIRECT_SCHEMES,
  DEFAULT_CALLBACK_PATH,
  REDIRECT_BASE_URL,
} from "./config";

export type ConnectedWallet = {
  address: string;
  chain: "evm" | "solana";
  walletName: string;
  walletImage: string;
};

// Read the optional nonce passed in when the page was loaded. If it wasn't
// provided, we don't send one back (per spec).
export function getIncomingNonce(): string | null {
  return new URLSearchParams(window.location.search).get("nonce");
}

// The integrator supplies where to send the user back via `redirect_uri`
// (alias `redirect_url`) - `http(s)` for a web callback, or a custom app scheme
// (e.g. `fbconnectdemo:`) so a native host embedding this page can catch the
// result. By default we accept any scheme except the dangerous ones (see
// isSchemeAllowed); a strict allow-list can be forced via env. Anything rejected
// falls back to the configured default. NOTE: a production deployment should ALSO
// allow-list the permitted `http(s)` hosts to avoid an open redirect.
export function getRedirectBase(): string {
  const params = new URLSearchParams(window.location.search);
  const candidate = params.get("redirect_uri") ?? params.get("redirect_url");
  if (candidate) {
    try {
      const parsed = new URL(candidate);
      if (isRedirectAllowed(parsed)) {
        return candidate;
      }
    } catch {
      // fall through to default
    }
  }
  return defaultRedirectBase();
}

// With no env override, fall back to the same-origin `/callback` page, which
// renders the params we hand back. Resolved here rather than in config.ts
// because it needs `window.location.origin`, which does not exist on the server.
function defaultRedirectBase(): string {
  if (REDIRECT_BASE_URL) return REDIRECT_BASE_URL;
  return new URL(DEFAULT_CALLBACK_PATH, window.location.origin).toString();
}

// Whether a parsed redirect target is safe to navigate to.
//
// - A configured allow-list, when present, is authoritative (strict mode).
// - Otherwise accept `http(s)`, plus any custom app scheme that is BOTH not on
//   the dangerous block-list AND hierarchical (`scheme://host`). The host
//   requirement is the important part: script/data vectors (`javascript:`,
//   `data:`, `vbscript:`) are opaque - they carry no host - so they're rejected
//   structurally, not just because they happen to be on the block-list (which
//   also catches the `javascript://x` authority-form trick). This avoids relying
//   on block-list completeness for the XSS-critical decision.
function isRedirectAllowed(parsed: URL): boolean {
  const scheme = parsed.protocol.replace(/:$/, "").toLowerCase();
  // The block-list is checked first and cannot be overridden. A configured
  // allow-list narrows what is permitted; it must never be able to widen it
  // back to a script scheme by naming one.
  if (BLOCKED_REDIRECT_SCHEMES.includes(scheme)) return false;
  if (ALLOWED_REDIRECT_SCHEMES) return ALLOWED_REDIRECT_SCHEMES.includes(scheme);
  if (scheme === "http" || scheme === "https") return true;
  return parsed.host.length > 0;
}

// The scheme of the resolved redirect target (e.g. "https", "fbapp"). Used to
// tell whether the return hop leaves the web view via a custom app scheme.
export function getRedirectScheme(): string {
  try {
    return new URL(getRedirectBase()).protocol.replace(/:$/, "").toLowerCase();
  } catch {
    return "";
  }
}

// Map Dynamic's chain identifier (e.g. "EVM", "SOL") to our redirect vocabulary.
export function normalizeChain(chain: string | null | undefined): "evm" | "solana" {
  const c = (chain ?? "").toUpperCase();
  if (c === "SOL" || c === "SOLANA" || c === "SVM") return "solana";
  return "evm";
}

// Tron mainnet addresses are Base58Check, always start with "T", and are
// exactly 34 chars. They overlap Solana's Base58 charset, so we must rule them
// out before matching Solana (a real 32-byte Solana key never encodes to 34
// chars). Tron isn't a supported chain here.
export function isTronAddress(input: string): boolean {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(input.trim());
}

// Detect which supported chain a pasted address belongs to. EVM addresses are
// 0x + 40 hex chars; Solana addresses are 32-44 base58 chars. Returns null for
// anything else (including Tron, which we detect separately for messaging).
export function detectAddressChain(input: string): "evm" | "solana" | null {
  const a = input.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return "evm";
  if (isTronAddress(a)) return null;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return "solana";
  return null;
}

// Human-friendly labels for the chain picker.
export function chainMeta(chain: string | null | undefined): {
  title: string;
  subtitle: string;
} {
  return normalizeChain(chain) === "solana"
    ? { title: "Solana", subtitle: "Solana network" }
    : { title: "Ethereum & EVM", subtitle: "Polygon, Base, Arbitrum & more" };
}

// Build the redirect URL back to the configured base with the connection
// details as query params. The nonce is echoed back only if one was received.
export function buildRedirectUrl(wallet: ConnectedWallet, nonce: string | null): string {
  const url = new URL(getRedirectBase());
  url.searchParams.set("address", wallet.address);
  url.searchParams.set("chain", wallet.chain);
  url.searchParams.set("walletName", wallet.walletName);
  url.searchParams.set("walletImage", wallet.walletImage);
  if (nonce) {
    url.searchParams.set("nonce", nonce);
  }
  // Record which surface the flow ran on, so our stand-in callback can send the
  // user back where they started (`/` embeds the widget beside the guide;
  // `/connect` is the bare embed). Added ONLY for our own callback page: the
  // documented outgoing contract is address / chain / walletName / walletImage /
  // nonce, and an integrator's endpoint should not receive extra params.
  if (isOwnCallback(url)) {
    url.searchParams.set("from", window.location.pathname);
  }
  return url.toString();
}

function isOwnCallback(url: URL): boolean {
  return (
    url.origin === window.location.origin &&
    url.pathname === DEFAULT_CALLBACK_PATH
  );
}

export function redirectToCallback(wallet: ConnectedWallet, nonce: string | null): void {
  window.location.assign(buildRedirectUrl(wallet, nonce));
}
