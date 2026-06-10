import {
  createDynamicClient,
  waitForClientInitialized as sdkWaitForClientInitialized,
  type DynamicClient,
} from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { addBaseAccountEvmExtension } from "@dynamic-labs-sdk/evm/base-account";
import { addWalletConnectEvmExtension } from "@dynamic-labs-sdk/evm/wallet-connect";
import { addSolanaExtension } from "@dynamic-labs-sdk/solana";
import { addWalletConnectSolanaExtension } from "@dynamic-labs-sdk/solana/wallet-connect";
import { createDynamicClientSingleton } from "@dynamic-demos/dynamic/client-singleton";
import { resolveCredentials } from "@dynamic-demos/dynamic/resolve-credentials";

/**
 * Patch all EIP-6963 announced providers so that `wallet_requestSnaps`
 * calls targeting `@consensys/starknet-snap` are auto-rejected.
 *
 * The Dynamic environment may have Starknet enabled, causing the SDK's
 * EVM extension to request the MetaMask Starknet snap on every
 * initialization cycle. If the user cancels, the SDK re-detects and
 * re-requests → infinite popup loop. The flow app doesn't need Starknet,
 * so we suppress the snap request entirely.
 *
 * Only patches once per page load.
 */
function suppressStarknetSnap(): void {
  if (typeof window === "undefined") return;

  const STARKNET_SNAP_ID = "@consensys/starknet-snap";
  const patched = new WeakSet<object>();

  function patchProvider(provider: {
    request: (...args: unknown[]) => unknown;
  }) {
    if (patched.has(provider)) return;
    patched.add(provider);

    const originalRequest = provider.request.bind(provider);
    provider.request = ((...args: unknown[]) => {
      const params = args[0] as { method?: string; params?: Record<string, unknown> } | undefined;
      if (
        params?.method === "wallet_requestSnaps" &&
        params.params &&
        STARKNET_SNAP_ID in params.params
      ) {
        return Promise.reject(new Error("Starknet snap suppressed by Flow app"));
      }
      return originalRequest(...args);
    }) as typeof provider.request;
  }

  // Patch providers announced via EIP-6963
  window.addEventListener("eip6963:announceProvider", ((event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (detail?.provider?.request) {
      patchProvider(detail.provider);
    }
  }) as EventListener);

  // Patch window.ethereum if already present
  const win = window as unknown as {
    ethereum?: { request: (...args: unknown[]) => unknown };
  };
  if (win.ethereum?.request) {
    patchProvider(win.ethereum);
  }
}

// Run once at module load (before SDK init)
suppressStarknetSnap();

/**
 * Lazy, SSR-safe Dynamic SDK singleton.
 *
 * Mirrors apps/checkouts' canonical pattern verbatim: one
 * `createDynamicClient` call per browser page, EVM + Solana extensions
 * registered in the singleton's `extend` hook (which runs synchronously
 * after `create`), and `waitForClientInitialized` is always invoked
 * with the captured client instance so the SDK knows which client to
 * report readiness for.
 *
 * Reads the Dynamic environment id through `resolveCredentials()` so
 * the D-003 workspace-default fallback works uniformly across apps.
 *
 * Note: WalletConnect is intentionally omitted for V1 — the demo's
 * primary wallet surface is the SDK's built-in providers + embedded
 * wallets. WalletConnect is a follow-up dep.
 */
const singleton = createDynamicClientSingleton<DynamicClient>({
  create: () => {
    const { environmentId } = resolveCredentials();
    return createDynamicClient({
      environmentId,
      autoInitialize: true,
      metadata: {
        name: "Flow Demo",
        universalLink: window.location.origin,
      },
    });
  },
  extend: (client) => {
    addEvmExtension(client);
    addSolanaExtension(client);
    // Coinbase Wallet + Coinbase Smart Wallet via `keys.coinbase.com`.
    // EIP-6963 / window-injected detection (handled by addEvmExtension
    // above) only surfaces Coinbase on desktop browsers where the
    // extension is installed. This extension fills the gaps: mobile
    // (deep-links into the Coinbase Wallet app), desktop without the
    // extension (popup), and Smart Wallet (passkey-based, no install
    // needed). Coinbase doesn't publish to the WalletConnect catalog
    // either, so without this, the modern Coinbase + Smart Wallet
    // paths are completely missing from the picker.
    //
    // `preference: { options: "all" }` (default) lets users pick
    // between Coinbase Wallet (EOA) and Coinbase Smart Wallet at the
    // popup. Use `"smartWalletOnly"` to push the passkey path, or
    // `"eoaOnly"` for legacy-only.
    addBaseAccountEvmExtension({ preference: { options: "all" } }, client);
    // WC is async — fire-and-forget; the SDK gates readiness internally.
    // Powers the "more wallets" catalog in the asset picker; EVM + SOL
    // extensions so the catalog entries for both chains can connect.
    void addWalletConnectEvmExtension(client);
    void addWalletConnectSolanaExtension(client);
  },
});

export function initializeDynamicClient(): void {
  // Touching the singleton triggers lazy create + extend.
  singleton.getClient();
}

export async function waitForDynamicClientInitialized(): Promise<void> {
  const client = singleton.getClient();
  if (!client) return;
  await sdkWaitForClientInitialized(client);
}

export function getDynamicClient(): DynamicClient | null {
  return singleton.getClient();
}
