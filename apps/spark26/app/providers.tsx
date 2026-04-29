"use client";

// Adapted from dynamic-sdk/apps/checkout-demo/src/app/components/DynamicClientProvider
// and dynamic-sdk/apps/checkout-demo/src/app/constants/dynamicClient.ts
// WalletConnect project ID is configured via the Dynamic dashboard project
// settings; the extension reads it from project settings at connect time.
import {
  createDynamicClient,
  initializeClient,
  waitForClientInitialized,
} from "@dynamic-labs-sdk/client";
import { addBitcoinExtension } from "@dynamic-labs-sdk/bitcoin";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { addWalletConnectEvmExtension } from "@dynamic-labs-sdk/evm/wallet-connect";
import { addSolanaExtension } from "@dynamic-labs-sdk/solana";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { env } from "@/lib/env";
import { createNoOpRealtimeService } from "@/lib/dynamic/no-op-realtime";
import { SparkBolt } from "@/components/ui/SparkBolt.js";

let initialized = false;

function initializeDynamicClient(): void {
  if (initialized) return;
  initialized = true;

  createDynamicClient({
    autoInitialize: false,
    coreConfig: {
      realtime: createNoOpRealtimeService(),
    },
    environmentId: env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    logLevel: "warn",
    metadata: {
      name: "SPARK26",
      universalLink:
        typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });

  void initializeClient();

  addEvmExtension();
  addSolanaExtension();
  addBitcoinExtension();
  void addWalletConnectEvmExtension();
}

function DynamicClientProvider({ children }: { children: ReactNode }) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initializeDynamicClient();
  }, []);

  const { data: isReady } = useQuery({
    queryKey: ["dynamicClientInitialized"],
    queryFn: async () => {
      await waitForClientInitialized();
      return true;
    },
    staleTime: Infinity,
  });

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[var(--color-blue)]">
          <SparkBolt size={40} animated />
          <p className="text-sm text-[color-mix(in_srgb,var(--color-blue-100)_65%,transparent)]">
            Initializing checkout…
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DynamicClientProvider>{children}</DynamicClientProvider>
    </QueryClientProvider>
  );
}
