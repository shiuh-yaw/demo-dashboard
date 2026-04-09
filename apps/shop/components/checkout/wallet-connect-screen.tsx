"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@dynamic-demos/ui";
import { Wallet } from "lucide-react";
import {
  getAvailableWalletProvidersData,
  connectWithWalletProvider,
  type WalletProviderData,
} from "@/lib/checkout-sdk";
import { useCheckout } from "@/lib/checkout-context";

export function WalletConnectScreen() {
  const { setScreen } = useCheckout();
  const [providers, setProviders] = useState<WalletProviderData[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProviders(getAvailableWalletProvidersData());
  }, []);

  const handleConnect = async (provider: WalletProviderData) => {
    setConnecting(provider.key);
    setError(null);
    try {
      await connectWithWalletProvider({
        walletProviderKey: provider.key,
      });
      // connectAndVerifyWithWalletProvider resolves on success
      setScreen("select-token");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to connect wallet";
      if (!msg.toLowerCase().includes("reject")) {
        setError(msg);
      }
    } finally {
      setConnecting(null);
    }
  };

  // Deduplicate by groupKey (e.g. MetaMask shows for both EVM chains)
  const seen = new Set<string>();
  const uniqueProviders = providers.filter((p) => {
    const key = p.groupKey || p.key;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Connect a wallet to pay for your items.
      </p>

      {uniqueProviders.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
          <Wallet className="h-10 w-10" />
          <p className="text-sm">No wallet providers detected</p>
          <p className="text-xs">Install a browser wallet extension to continue</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {uniqueProviders.map((provider) => (
          <button
            key={provider.key}
            onClick={() => handleConnect(provider)}
            disabled={connecting !== null}
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-50 text-left"
          >
            {provider.metadata.icon ? (
              <img
                src={provider.metadata.icon}
                alt=""
                className="h-8 w-8 rounded-md"
              />
            ) : (
              <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <span className="font-medium text-sm text-foreground flex-1">
              {provider.metadata.displayName}
            </span>
            {connecting === provider.key && <Spinner size="sm" />}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
