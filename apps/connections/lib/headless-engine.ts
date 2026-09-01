// The headless connect engine.
//
// This module runs the Dynamic SDK with NO visible UI, inside a hidden iOS
// WKWebView (or a desktop test iframe). Native renders the wallet list itself
// and drives this engine over a JS bridge:
//
//   native → JS:  window.headlessConnect.connect({ requestId, walletKey, chain })
//                 window.headlessConnect.cancel(requestId)
//                 window.headlessConnect.onDeeplinkFailed(requestId)
//                 window.headlessConnect.sign({ requestId, message })
//                 window.headlessConnect.signTx({ requestId, transaction })
//   JS → native:  see bridge.ts HostMessage (ready / deeplink / connected /
//                 fallback / error / event / signed / signedTx / *Failed)
//
// For WalletConnect-protocol wallets (MetaMask, Rainbow, Trust, …) the
// connection is relay-based - mint a URI, the wallet approves out-of-band, the
// approval() promise resolves over a WebSocket - so no visible page is needed.
// Wallets with no such path (Coinbase Smart Wallet passkey/email, in-app-browser
// only) get a `fallback` message so native opens the visible flow instead.

import {
  connectWithWalletProvider,
  getDefaultClient,
  getWalletAccounts,
  getWalletOptionsCatalogue,
  logout,
  signMessage,
  waitForClientInitialized,
} from "@dynamic-labs-sdk/client";
import {
  getLastKnownNetworkRegistry,
  getWalletProviderFromWalletAccount,
} from "@dynamic-labs-sdk/client/core";
import { clearMetaMaskSessionStorage } from "@dynamic-labs-sdk/metamask";
import { isEvmWalletAccount } from "@dynamic-labs-sdk/evm";
import {
  completePhantomRedirect,
  isSolanaWalletAccount,
  signTransaction as signSolanaTx,
} from "@dynamic-labs-sdk/solana";
import {
  Transaction as SolanaTransaction,
  VersionedTransaction,
} from "@solana/web3.js";

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

// The address the last successful connect() returned. sign()/signTx() act on
// this account, not "whatever is in the registry" - a host may have connected
// several wallets over one engine lifetime.
let lastConnectedAddress: string | undefined;

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
      const client = getClient();
      if (client) await clearMetaMaskSessionStorage(client);
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
      lastConnectedAddress = account.address;
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
      const client = getClient();
      if (client) await clearMetaMaskSessionStorage(client);
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

    lastConnectedAddress = account.address;
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
// Resolve the account sign()/signTx() act on: the one the last connect()
// returned, not merely the first in the registry.
function connectedAccount() {
  const target = lastConnectedAddress?.toLowerCase();
  if (!target) return undefined;
  return getWalletAccounts().find((a) => a.address.toLowerCase() === target);
}

// Phantom's signing path calls getPhantomCluster(), which throws "No networks
// found for chain SOL" when the environment registers no Solana networks.
// Pre-seeding a sentinel networkId bypasses that lookup.
async function seedSolanaNetwork(account: {
  walletProviderKey: string;
}): Promise<void> {
  await getLastKnownNetworkRegistry(getDefaultClient()).setNetworkId({
    walletProviderKey: account.walletProviderKey,
    networkId: "_phantom_default_",
  });
}

// The host calls this when it could not open the wallet deeplink. Falls back
// immediately instead of leaving the caller on the startup timeout.
function onDeeplinkFailed(requestId: string): void {
  fallback(requestId, "wallet not installed");
}

/** Sign a message with the connected wallet. Returns a hex signature. */
async function sign(params: { requestId: string; message: string }): Promise<void> {
  const { requestId, message } = params;
  try {
    const account = connectedAccount();
    if (!account) {
      sendToHost({
        type: "signFailed",
        requestId,
        code: "no_wallet",
        message: "no wallet connected - call connect() first",
      });
      return;
    }
    if (isSolanaWalletAccount(account)) await seedSolanaNetwork(account);
    const { signature } = await signMessage({ walletAccount: account, message });
    sendToHost({ type: "signed", requestId, signature, message });
    emit("signed", requestId);
  } catch (e) {
    sendToHost({
      type: "signFailed",
      requestId,
      code: classify(e),
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Sign a transaction with the connected wallet. Signs only - never broadcasts.
 *
 * `transaction` is a JSON tx object for EVM (`chainId` required) or a base64
 * serialised Solana transaction. The result is RLP hex or base64 respectively.
 */
async function signTx(params: { requestId: string; transaction: string }): Promise<void> {
  const { requestId, transaction } = params;
  const failTx = (code: string, message: string) =>
    sendToHost({ type: "signTxFailed", requestId, code, message });
  try {
    const account = connectedAccount();
    if (!account) {
      failTx("no_wallet", "no wallet connected - call connect() first");
      return;
    }

    if (isSolanaWalletAccount(account)) {
      await seedSolanaNetwork(account);
      const binaryStr = atob(transaction);
      const txBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) txBytes[i] = binaryStr.charCodeAt(i);

      let solTx: VersionedTransaction | SolanaTransaction;
      try {
        solTx = VersionedTransaction.deserialize(txBytes);
      } catch {
        solTx = SolanaTransaction.from(txBytes);
      }

      const { signedTransaction } = await signSolanaTx({
        walletAccount: account,
        transaction: solTx,
      });
      const signed =
        signedTransaction instanceof VersionedTransaction
          ? signedTransaction.serialize()
          : signedTransaction.serialize({
              requireAllSignatures: false,
              verifySignatures: false,
            });
      let binary = "";
      for (const b of new Uint8Array(signed)) binary += String.fromCharCode(b);
      sendToHost({
        type: "signedTx",
        requestId,
        signedTransaction: btoa(binary),
        chain: "solana",
      });
      emit("signed_tx", requestId, { chain: "solana" });
      return;
    }

    if (!isEvmWalletAccount(account)) {
      failTx("unsupported_chain", "connected wallet is neither EVM nor Solana");
      return;
    }

    const txParams = JSON.parse(transaction) as Record<string, unknown>;
    // Fail loud rather than sign on whatever network the wallet happens to be
    // on - a silent wrong-chain signature is the worst outcome here.
    if (txParams.chainId === undefined || txParams.chainId === null) {
      failTx("missing_chain_id", "chainId is required for EVM transactions");
      return;
    }

    const provider = getWalletProviderFromWalletAccount(
      { walletAccount: account },
      getDefaultClient(),
    ) as unknown as {
      request: (args: { method: string; params: unknown[] }) => Promise<string>;
    };
    const signedHex = await provider.request({
      method: "eth_signTransaction",
      params: [{ from: account.address, ...txParams }],
    });
    sendToHost({ type: "signedTx", requestId, signedTransaction: signedHex, chain: "evm" });
    emit("signed_tx", requestId, { chain: "evm" });
  } catch (e) {
    failTx(classify(e), e instanceof Error ? e.message : String(e));
  }
}

export function startHeadlessEngine(): void {
  if (started) return;
  started = true;

  // Creates the client and registers the chain extensions. Upstream got this
  // from `import "./dynamicClient"`; the client is a lazy singleton now, so the
  // engine has to ask for it.
  getClient();

  // Expose the API native calls.
  (window as unknown as { headlessConnect: unknown }).headlessConnect = {
    connect,
    cancel,
    handleReturnURL,
    onDeeplinkFailed,
    sign,
    signTx,
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
