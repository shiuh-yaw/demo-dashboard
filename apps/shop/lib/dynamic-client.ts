import {
  createDynamicClient,
  initializeClient,
  waitForClientInitialized as sdkWaitForClientInitialized,
} from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { addSolanaExtension } from "@dynamic-labs-sdk/solana";
import { addWalletConnectEvmExtension } from "@dynamic-labs-sdk/evm/wallet-connect";
import { env } from "./env";

/**
 * Initialize the Dynamic SDK client.
 * Matches the checkout-demo pattern: autoInitialize: false + explicit initializeClient().
 * Must be called exactly once from a useEffect.
 */
export const initializeDynamicClient = (): void => {
  createDynamicClient({
    environmentId: env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
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
