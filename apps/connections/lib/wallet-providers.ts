import { isMobile } from "@dynamic-labs-sdk/client";

import { FEATURED_LIST_SIZE, FEATURED_WALLETS } from "./config";
import { getEnvInfo } from "./runtime-env";
import { normalizeChain } from "./redirect";

// Shapes mirror Dynamic's getWalletOptionsCatalogue() output. Typed defensively
// because we only read a subset of each entry.
export type WalletConnectionOption = {
  type: "withWalletProvider" | "walletConnect" | "metamaskSdkUri" | "inAppBrowser";
  chain?: string;
  walletProviderKey?: string;
  // Where the provider came from: `sdk` = hosted (e.g. Base Account), the
  // others = an actually-installed browser wallet.
  source?: "selfAnnounced" | "windowInjected" | "sdk";
  // For URI-deeplink options (walletConnect / metamaskSdkUri).
  deeplinks?: { native?: string; universal?: string };
  // For inAppBrowser options: a URL template with `{{encodedDappURI}}`.
  url?: string;
};

export type InstallationUrls = {
  android?: string;
  chrome?: string;
  edge?: string;
  firefox?: string;
  ios?: string;
  native?: string;
  opera?: string;
  safari?: string;
};

export type WalletOption = {
  key: string;
  name: string;
  iconUrl?: string;
  primaryColor?: string;
  connectionOptions?: WalletConnectionOption[];
  installationUrls?: InstallationUrls;
};

// A connectable chain for an installed wallet (one entry per chain family).
export type Connector = {
  chain: "evm" | "solana";
  walletProviderKey: string;
};

function haystack(w: WalletOption): string {
  return `${w.key} ${w.name}`.toLowerCase();
}

// Search-list ordering: featured wallets, then WalletConnect, then the rest of
// the catalogue in its natural order.
const PRIORITY = [...FEATURED_WALLETS, "walletconnect"];

function priorityIndex(w: WalletOption): number {
  // Detected browser extensions sort to the very top on desktop.
  if (!isMobile() && hasInstalledExtension(w)) return -1;
  const hay = haystack(w);
  for (let i = 0; i < PRIORITY.length; i++) {
    const keyword = PRIORITY[i];
    if (keyword && hay.includes(keyword)) return i;
  }
  return PRIORITY.length + 100;
}

// The installed (browser-extension / SDK) connectors for a wallet, one per
// chain family. Empty means the wallet isn't installed on this device.
// A deep-link redirect provider (e.g. Phantom's `phantomsol:deepLink`) is a
// wallet provider only in the sense that it navigates to a mobile app - it is
// not a real installed/injected wallet and is meaningless on desktop.
function isDeepLinkProvider(o: WalletConnectionOption): boolean {
  return /deeplink/i.test(o.walletProviderKey ?? "");
}

export function installedConnectors(w: WalletOption): Connector[] {
  const mobile = isMobile();
  // Inside an embedded web view, a deep-link redirect connector (e.g. Phantom's
  // encrypted-redirect protocol) returns to the page's https URL, which the OS
  // opens in Safari - not back into the host app - breaking the flow. So treat
  // it like desktop and skip it, letting the wallet fall through to a relay
  // (WalletConnect) or its in-app browser, both of which return via our scheme.
  const embedded = getEnvInfo().isWebView;
  const seen = new Set<string>();
  const out: Connector[] = [];
  for (const o of w.connectionOptions ?? []) {
    if (o.type === "withWalletProvider" && o.walletProviderKey) {
      // Deep-link providers are for real mobile browsers only; on desktop and in
      // embedded web views we require a real injected extension (or fall back).
      if (isDeepLinkProvider(o) && (!mobile || embedded)) continue;
      const chain = normalizeChain(o.chain);
      if (!seen.has(chain)) {
        seen.add(chain);
        out.push({ chain, walletProviderKey: o.walletProviderKey });
      }
    }
  }
  return out;
}

export function isInstalled(w: WalletOption): boolean {
  return installedConnectors(w).length > 0;
}

// True when the wallet is detected/connectable directly on this device - i.e.
// it has a `withWalletProvider` connector (Dynamic's "installed" tier). MetaMask
// reports its provider as `source: "sdk"`, same as Base Account, so we can't
// filter on source; instead we exclude the deep-link redirect (Phantom mobile)
// and Base Account (a hosted smart wallet that's always available, not
// "installed"). Drives the "Installed" pill.
export function hasInstalledExtension(w: WalletOption): boolean {
  const hay = `${w.key} ${w.name}`.toLowerCase();
  if (hay.includes("base account") || hay.includes("baseaccount")) return false;
  return (w.connectionOptions ?? []).some(
    (o) => o.type === "withWalletProvider" && !isDeepLinkProvider(o),
  );
}

// The featured row: detected browser extensions first (desktop), then the
// configured featured wallets, deduped.
export function featuredOptions(options: WalletOption[]): WalletOption[] {
  const result: WalletOption[] = [];
  if (!isMobile()) {
    for (const w of options) {
      if (hasInstalledExtension(w) && !result.includes(w)) result.push(w);
    }
  }
  for (const keyword of FEATURED_WALLETS) {
    const match = options.find((w) => haystack(w).includes(keyword));
    if (match && !result.includes(match)) result.push(match);
  }
  return result.slice(0, FEATURED_LIST_SIZE);
}

// Full list: featured first (in order), otherwise preserve the catalogue's
// relevance ordering (installed wallets already come first from the SDK).
export function sortedOptions(
  options: WalletOption[],
  search: string,
): WalletOption[] {
  const term = search.trim().toLowerCase();
  return options
    .map((w, index) => ({ w, index }))
    .filter(({ w }) => (term ? haystack(w).includes(term) : true))
    .sort((a, b) => {
      const pa = priorityIndex(a.w);
      const pb = priorityIndex(b.w);
      if (pa !== pb) return pa - pb;
      return a.index - b.index;
    })
    .map(({ w }) => w);
}
