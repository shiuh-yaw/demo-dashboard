// The headless connect engine.
//
// This module runs the Dynamic SDK with NO visible UI, inside a hidden iOS
// WKWebView (or a desktop test iframe). Native renders the wallet list itself
// and drives this engine over a JS bridge:
//
//   native → JS:  window.fbHeadless.connect({ requestId, walletKey, chain })
//                 window.fbHeadless.cancel(requestId)
//   JS → native:  see bridge.ts HostMessage (ready / deeplink / connected /
//                 fallback / error / event)
//
// For WalletConnect-protocol wallets (MetaMask, Rainbow, Trust, …) the
// connection is relay-based - mint a URI, the wallet approves out-of-band, the
// approval() promise resolves over a WebSocket - so no visible page is needed.
// Wallets with no such path (Coinbase Smart Wallet passkey/email, in-app-browser
// only) get a `fallback` message so native opens the visible flow instead.

import {
  connectWithWalletProvider,
  getWalletOptionsCatalogue,
  logout,
  waitForClientInitialized,
} from "@dynamic-labs-sdk/client";
import { clearMetaMaskSessionStorage } from "@dynamic-labs-sdk/metamask";
import { completePhantomRedirect } from "@dynamic-labs-sdk/solana";

import { buildOpenableDeeplink, mintConnection } from "./connect-engine";
import { normalizeChain } from "./redirect";
import { sendToHost } from "./bridge";
import { getClient } from "./dynamic-client";
import type { WalletOption } from "./wallet-providers";

type Chain = "evm" | "solana";
type ConnectParams = { requestId: string; walletKey: string; chain?: Chain };

const sessionId = mintSessionId();

// Monotonic guard so a newer connect() (or cancel) abandons an older attempt's
// async continuation - mirrors the visible flow's wcAttemptId.
let attempt = 0;

function mintSessionId(): string {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
    /* ignore */
  }
  return `sid_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function emit(event: string, requestId: string | undefined, data?: Record<string, unknown>): void {
  sendToHost({ type: "event", event, requestId, data, sessionId, t: Date.now() });
}

function extractMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "";
}

function classify(e: unknown): string {
  const msg = extractMsg(e);
  const code =
    e && typeof e === "object" && "code" in e ? (e as { code: unknown }).code : undefined;
  if (code === 4001 || code === "ACTION_REJECTED" || /reject|denied|declined|cancel|dismiss/i.test(msg))
    return "user_rejected";
  if (/already pending|already processing|-32002/i.test(msg)) return "already_pending";
  if (/timeout|timed out/i.test(msg)) return "timeout";
  if (/uri|mint|approval|session/i.test(msg)) return "mint_failed";
  return "unknown";
}

// The mobile catalogue is ~600 wallets; building it is not cheap. It's stable
// on mobile (no EIP-6963 extensions announcing late), so fetch it once and
// reuse - otherwise every tap pays the cost.
let cataloguePromise: Promise<WalletOption[]> | null = null;
function loadCatalogue(): Promise<WalletOption[]> {
  if (!cataloguePromise) {
    cataloguePromise = getWalletOptionsCatalogue({ includeMobileOptions: true }).then(
      (c) => c as unknown as WalletOption[],
    );
  }
  return cataloguePromise;
}

function resolveWallet(catalogue: WalletOption[], key: string): WalletOption | undefined {
  const k = key.toLowerCase();
  return (
    catalogue.find((w) => w.key?.toLowerCase() === k) ??
    catalogue.find((w) => w.name?.toLowerCase() === k)
  );
}

// The native wallet list is derived live from the catalogue and pushed to the
// host - no static walletbook file to ship or keep in sync. The 4 wallets the
// web flow features by default are marked `featured` (shown by default); the
// full catalogue rides along so native search matches the web.
const FEATURED = ["metamask", "baseaccount", "okxwallet", "phantom"];

interface MenuEntry {
  key: string;
  name: string;
  icon: string;
  chains: string[];
  mode: "headless" | "fallback";
  featured: boolean;
}

function toMenuEntry(w: WalletOption): MenuEntry {
  const uri = (w.connectionOptions ?? []).filter(
    (o) => o.type === "walletConnect" || o.type === "metamaskSdkUri",
  );
  const isPhantom = w.key?.toLowerCase() === "phantom";
  // headless: relay-URI wallets, plus Phantom's redirect protocol.
  const headless = uri.length > 0 || isPhantom;
  const chains = isPhantom
    ? ["solana"]
    : [...new Set((w.connectionOptions ?? []).map((o) => normalizeChain(o.chain)))].filter(
        (c) => c === "evm" || c === "solana",
      );
  return {
    key: w.key,
    name: w.name,
    icon: w.iconUrl ?? "",
    chains: chains.length ? chains : ["evm"],
    mode: headless ? "headless" : "fallback",
    featured: FEATURED.includes(w.key),
  };
}

function deriveMenu(catalogue: WalletOption[]): MenuEntry[] {
  const cleanKey = (k?: string) => !!k && /^[a-z0-9][a-z0-9._-]{0,31}$/.test(k);
  // Featured first, in order; then the rest of the catalogue (real slug keys).
  const featured = FEATURED.map((k) => catalogue.find((w) => w.key === k))
    .filter((w): w is WalletOption => Boolean(w))
    .map(toMenuEntry);
  const rest = catalogue
    .filter((w) => cleanKey(w.key) && w.name && !FEATURED.includes(w.key))
    .map(toMenuEntry);
  return [...featured, ...rest];
}

// Tear down the session after each attempt (best-effort, non-blocking) so
// re-connecting the same wallet works - a lingering WC/Dynamic session
// otherwise blocks a second connect. Not awaited before a connect: a full
// logout can hang on mobile.
function clearSessions(): void {
  void (async () => {
    try {
      await logout();
    } catch {
      /* best effort */
    }
    try {
      await clearMetaMaskSessionStorage();
    } catch {
      /* best effort */
    }
  })();
}

async function connect(params: ConnectParams): Promise<void> {
  const { requestId, walletKey } = params;
  const preferredChain = params.chain;
  const myId = ++attempt;
  const superseded = () => myId !== attempt;

  emit("wallet_selected", requestId, { walletKey, chain: preferredChain });
  try {
    const catalogue = await loadCatalogue();
    if (superseded()) return;

    const wallet = resolveWallet(catalogue, walletKey);
    if (!wallet) {
      return fallback(requestId, `unknown wallet: ${walletKey}`);
    }

    // Prefer the chain the caller asked for; fall back to any chain the wallet
    // offers. Pick a URI-deeplink option (MetaMask SDK URI first, else
    // WalletConnect). Anything else (inAppBrowser only) can't go headless.
    const options = wallet.connectionOptions ?? [];
    const chainOpts = preferredChain
      ? options.filter((o) => normalizeChain(o.chain) === preferredChain)
      : options;
    const pool = chainOpts.length ? chainOpts : options;
    const opt =
      pool.find((o) => o.type === "metamaskSdkUri") ??
      pool.find((o) => o.type === "walletConnect") ??
      pool.find((o) => o.type === "withWalletProvider");
    if (!opt) {
      return fallback(requestId, `no headless connection path for ${walletKey}`);
    }
    const chain = normalizeChain(opt.chain);

    // Phantom uses an encrypted redirect protocol, not a relay URI. Drive it via
    // connectWithWalletProvider: the wallet opens through the native nav-delegate,
    // and the return comes back through native → handleReturnURL →
    // completePhantomRedirect, which resolves this pending promise. Only Phantom
    // is headless-capable this way; other withWalletProvider wallets (Base
    // Account passkey/email) need the visible flow.
    if (opt.type === "withWalletProvider") {
      if (walletKey.toLowerCase() !== "phantom" || !opt.walletProviderKey) {
        return fallback(requestId, `${walletKey} needs the visible flow`);
      }
      sendToHost({ type: "opening", requestId });
      emit("deeplink_opened", requestId, { walletKey, chain });
      const account = await connectWithWalletProvider({ walletProviderKey: opt.walletProviderKey });
      if (superseded()) return;
      if (!account?.address) return fail(requestId, "unknown", "no account returned");
      sendToHost({
        type: "connected",
        requestId,
        address: account.address,
        chain,
        walletName: wallet.name,
        walletImage: wallet.iconUrl ?? "",
        sessionId,
      });
      emit("connected", requestId, { chain, walletName: wallet.name });
      clearSessions();
      return;
    }

    // Clear MetaMask's session storage first - otherwise its SDK tries to RESUME
    // a prior session (~10s) before minting, which is the main cause of a slow
    // prompt. Fast + best-effort; harmless for non-MetaMask wallets.
    try {
      await clearMetaMaskSessionStorage();
    } catch {
      /* best effort */
    }
    if (superseded()) return;

    const { uri, approval } = await mintConnection(opt);
    if (superseded()) return;

    // Always embedded here (a hidden webview / native host), so prefer native
    // wallet schemes that open instantly.
    const deeplink = buildOpenableDeeplink(uri, opt, true);
    sendToHost({ type: "deeplink", requestId, url: deeplink });
    emit("deeplink_opened", requestId, { walletKey, chain });

    const { walletAccounts } = await approval();
    if (superseded()) return;
    const account = walletAccounts[0];
    if (!account?.address) {
      return fail(requestId, "unknown", "no account returned");
    }

    sendToHost({
      type: "connected",
      requestId,
      address: account.address,
      chain,
      walletName: wallet.name,
      walletImage: wallet.iconUrl ?? "",
      sessionId,
    });
    emit("connected", requestId, { chain, walletName: wallet.name });
    clearSessions();
  } catch (e) {
    if (superseded()) return;
    fail(requestId, classify(e), e instanceof Error ? e.message : String(e));
  }
}

function fail(requestId: string, code: string, message: string): void {
  emit("error", requestId, { code, message });
  sendToHost({ type: "error", requestId, code, message, sessionId });
  clearSessions();
}

function fallback(requestId: string, reason: string): void {
  emit("fallback", requestId, { reason });
  sendToHost({ type: "fallback", requestId, reason });
}

function cancel(_requestId: string): void {
  attempt++;
}

// Called by native when Phantom redirects back to the app's custom scheme.
// Feeds the callback URL to the SDK, which decrypts it and resolves the pending
// connectWithWalletProvider promise above.
async function handleReturnURL(url: string): Promise<void> {
  try {
    await completePhantomRedirect({ url: new URL(url) });
  } catch {
    // The pending connect promise rejects on its own; nothing to do here.
  }
}

let started = false;

/**
 * Boot the engine: expose the API native calls, wait for the SDK, then push the
 * derived wallet list and a `ready` message to the host.
 *
 * Upstream ran this as an import side effect (the module was the entry point of
 * its own `headless.html`). Under Next the module can be evaluated on the
 * server, so the browser-only work is behind this explicit call - the
 * `/headless` route invokes it from a client effect. Idempotent: React strict
 * mode double-invokes effects, and re-announcing `ready` would make the host
 * think a second engine came up.
 */
export function startHeadlessEngine(): void {
  if (started) return;
  started = true;

  // Creates the client and registers the chain extensions. Upstream got this
  // from `import "./dynamicClient"`; the client is a lazy singleton now, so the
  // engine has to ask for it.
  getClient();

  // Expose the API native calls.
  (window as unknown as { fbHeadless: unknown }).fbHeadless = {
    connect,
    cancel,
    handleReturnURL,
    sessionId,
  };

  void (async () => {
    await waitForClientInitialized();
    // Load the catalogue once (warms it for the first connect) and hand the
    // derived wallet list to the host - no static walletbook file needed.
    const catalogue = await loadCatalogue();
    sendToHost({ type: "wallets", wallets: deriveMenu(catalogue) });
    sendToHost({ type: "ready" });
  })();
}
