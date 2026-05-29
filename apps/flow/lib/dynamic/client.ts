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
