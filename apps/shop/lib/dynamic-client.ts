import {
  createDynamicClient,
  initializeClient,
  waitForClientInitialized as sdkWaitForClientInitialized,
} from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { addSolanaExtension } from "@dynamic-labs-sdk/solana";
import { addWalletConnectEvmExtension } from "@dynamic-labs-sdk/evm/wallet-connect";
import { resolveCredentials } from "@dynamic-demos/dynamic/resolve-credentials";

/**
 * Initialize the Dynamic SDK client.
 *
 * Matches the checkout-demo pattern: `autoInitialize: false` + explicit
 * `initializeClient()`. Must be called exactly once from a `useEffect`. The
 * `<DynamicClientProvider>` component handles the once-only invariant via a
 * ref guard.
 *
 * Reads the Dynamic environment id through `resolveCredentials()` so the
 * workspace-default fallback (D-003) is honored uniformly with the other
 * Phase 1D-migrated apps.
 */
export const initializeDynamicClient = (): void => {
  const { environmentId } = resolveCredentials();
  createDynamicClient({
    environmentId,
    autoInitialize: false,
    metadata: {
      name: "Crypto Shop",
      universalLink: typeof window !== "undefined" ? window.location.origin : "",
    },
  });

  void initializeClient();

  addEvmExtension();
  addSolanaExtension();
  void addWalletConnectEvmExtension();
};

export const waitForDynamicClientInitialized = async (): Promise<void> => {
  await sdkWaitForClientInitialized();
};
