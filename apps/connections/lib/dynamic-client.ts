"use client";

/**
 * Dynamic SDK client - lazy, browser-only singleton.
 *
 * Upstream created the client at module scope and read `window.location` while
 * doing it. Under Next that runs during SSR, so everything here is deferred
 * into `createDynamicClientSingleton`'s lazy `create` / `extend` callbacks,
 * which only ever run in the browser (the factory returns null on the server).
 *
 * Extension registration order is load-bearing and preserved from upstream:
 * chains first, then WalletConnect after `initializeClient()` resolves.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/client/create-dynamic-client
 */

import {
  createDynamicClient,
  initializeClient,
  type DynamicClient,
} from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { addBaseAccountEvmExtension } from "@dynamic-labs-sdk/evm/base-account";
import { addWalletConnectEvmExtension } from "@dynamic-labs-sdk/evm/wallet-connect";
import {
  addSolanaExtension,
  addPhantomRedirectSolanaExtension,
} from "@dynamic-labs-sdk/solana";
import { addWalletConnectSolanaExtension } from "@dynamic-labs-sdk/solana/wallet-connect";
import { createDynamicClientSingleton } from "@dynamic-demos/dynamic/client-singleton";

import { BLOCKED_REDIRECT_SCHEMES, DYNAMIC_ENVIRONMENT_ID } from "./config";

/**
 * The host app's custom scheme, passed by FireblocksHeadlessConnect as
 * `?returnScheme=<scheme>` when running headless. Used ONLY to build Phantom's
 * redirect target - NOT the dApp metadata: MetaMask's SDK-URI protocol needs an
 * https `universalLink`, and a custom scheme there breaks its mint.
 *
 * The scheme is untrusted query input that flows into a redirect target, so
 * validate strictly: a well-formed custom scheme, never a dangerous one
 * (javascript:, data:, …).
 */
function readReturnScheme(): string | null {
  const raw = new URLSearchParams(window.location.search).get("returnScheme");
  if (!raw) return null;
  if (!/^[a-z][a-z0-9.+-]{1,32}$/.test(raw)) return null;
  if (BLOCKED_REDIRECT_SCHEMES.includes(raw.toLowerCase())) return null;
  return raw;
}

const singleton = createDynamicClientSingleton<DynamicClient>({
  create: () =>
    createDynamicClient({
      autoInitialize: false,
      environmentId: DYNAMIC_ENVIRONMENT_ID,
      metadata: {
        name: "Fireblocks",
        // Must be https - MetaMask's SDK-URI mint fails on a custom scheme.
        universalLink: window.location.origin,
      },
    }),
  extend: (client) => {
    // Register EVM + Solana. Default extensions include external wallet
    // discovery, which is what a connect-only external-wallet flow needs.
    addEvmExtension(client);
    addSolanaExtension(client);
    // Base Account is an SDK connector (@base-org/account), so it surfaces as
    // a connectable wallet even without a browser extension installed.
    addBaseAccountEvmExtension(undefined, client);

    // Phantom on mobile uses its own encrypted deep-link redirect protocol (not
    // WalletConnect). In the headless engine we point its redirect at the host
    // app's custom scheme and complete it manually (completePhantomRedirect)
    // when native forwards the return URL - so Phantom connects with no visible
    // flow. In the normal web flow it redirects back to the current URL and
    // auto-completes.
    const returnScheme = readReturnScheme();
    if (returnScheme) {
      void addPhantomRedirectSolanaExtension(
        {
          url: new URL(`${returnScheme}://phantom-headless`),
          disableAutoRedirectCompletion: true,
          // No clone tab with a custom-scheme redirect, so nothing to close.
          onCloseTab: () => {},
        },
        client,
      );
    } else {
      void addPhantomRedirectSolanaExtension(
        {
          url: new URL(window.location.href),
          // Close the redirect tab Phantom opens once the result is delivered.
          onCloseTab: () => window.close(),
        },
        client,
      );
    }

    // WalletConnect powers QR / deep-link connections for wallets that aren't
    // installed on this device (requires a WalletConnect project ID in the
    // Dynamic dashboard). Its provider recovery needs project settings, which
    // only exist after initialization - so register these once init completes
    // to avoid a "Project settings tracker not found" error.
    void initializeClient(client)
      .then(() => {
        addWalletConnectEvmExtension(client);
        addWalletConnectSolanaExtension(client);
      })
      .catch(() => {
        /* init errors surface via useInitStatus in the UI */
      });
  },
});

/**
 * Get or create the Dynamic client. Returns null during SSR - callers either
 * render behind a client-ready gate or bail out.
 */
export function getClient(): DynamicClient | null {
  return singleton.getClient();
}
