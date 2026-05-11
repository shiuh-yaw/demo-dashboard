"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getAvailableWalletProviders,
  connectAndVerifyWithWalletProvider,
  waitForClientInitialized,
} from "@/lib/dynamic";
import { ensureEmbeddedEvmWalletAddress } from "@/lib/ensure-embedded-wallet";
import type { WalletProviderData } from "@/lib/dynamic";
import { useDepositWidgetFlow } from "@/contexts/deposit-widget-flow-context";
import { WidgetCard, Spinner, ErrorBanner } from "@dynamic-demos/ui";
import { depositWidgetLargeSpinnerClassName } from "./deposit-widget-loading";

/** Wallet connect UI; must render under {@link DepositWidgetFlowProvider}. */
export function ConnectScreen() {
  const {
    handleConnected: onConnected,
    retryProvisioning,
    provisionError: initialError,
    clearProvisionError: onClearError,
  } = useDepositWidgetFlow();
  const [providers, setProviders] = useState<WalletProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [retryingProvision, setRetryingProvision] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  useEffect(() => {
    setError(initialError ?? null);
  }, [initialError]);

  useEffect(() => {
    const init = async () => {
      try {
        await waitForClientInitialized();
        const available = getAvailableWalletProviders();
        setProviders(available || []);
      } catch {
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleConnect = useCallback(
    async (walletProviderKey: string) => {
      setConnecting(walletProviderKey);
      setError(null);
      onClearError?.();
      try {
        await connectAndVerifyWithWalletProvider({ walletProviderKey });

        const embeddedAddress = await ensureEmbeddedEvmWalletAddress();
        if (!embeddedAddress) {
          throw new Error("Failed to create embedded wallet");
        }

        onConnected(embeddedAddress);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Connection failed";
        if (
          message.includes("User rejected") ||
          message.includes("user rejected")
        ) {
          setError("Signature cancelled. Please try again.");
        } else {
          setError(message);
        }
      } finally {
        setConnecting(null);
      }
    },
    [onConnected, onClearError],
  );

  const handleRetryProvision = useCallback(async () => {
    setRetryingProvision(true);
    setError(null);
    onClearError?.();
    try {
      await retryProvisioning();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Provisioning failed";
      setError(message);
    } finally {
      setRetryingProvision(false);
    }
  }, [retryProvisioning, onClearError]);

  // Filter to EVM providers only, group by wallet
  const walletGroups = Object.values(
    providers
      .filter((p) => p.chain === "EVM")
      .reduce(
        (acc, provider) => {
          const groupKey =
            provider.groupKey || provider.key.replace(/evm$|sol$/, "");
          if (!acc[groupKey]) {
            acc[groupKey] = {
              key: provider.key,
              displayName: provider.metadata?.displayName || groupKey,
              iconUrl: provider.metadata?.icon,
            };
          }
          return acc;
        },
        {} as Record<
          string,
          { key: string; displayName: string; iconUrl?: string }
        >,
      ),
  );

  return (
    <WidgetCard title="Deposit">
      <div className="space-y-3">
        {error && (
          <div className="space-y-2">
            <ErrorBanner
              message={error}
              onDismiss={() => {
                setError(null);
                onClearError?.();
              }}
            />
            {initialError !== null && (
              <button
                type="button"
                onClick={() => void handleRetryProvision()}
                disabled={retryingProvision || connecting !== null}
                className="w-full text-sm font-medium rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) py-2 px-3 hover:bg-(--brand-row-hover) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {retryingProvision ? "Retrying…" : "Try again"}
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" className={depositWidgetLargeSpinnerClassName} />
          </div>
        ) : walletGroups.length === 0 ? (
          <p className="text-sm text-(--brand-muted) text-center py-8">
            No wallets detected. Install MetaMask or another EVM wallet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {walletGroups.map((wallet) => (
              <button
                key={wallet.key}
                type="button"
                onClick={() => handleConnect(wallet.key)}
                disabled={connecting !== null}
                className="flex items-center gap-3 p-3 rounded-(--brand-radius) border border-(--brand-border) hover:bg-(--brand-row-hover) transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-7 h-7 shrink-0">
                  {wallet.iconUrl ? (
                    <img
                      src={wallet.iconUrl}
                      alt={wallet.displayName}
                      className="w-full h-full object-contain rounded"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-(--brand-row-bg)" />
                  )}
                </div>
                <span className="flex-1 text-left text-sm font-medium">
                  {wallet.displayName}
                </span>
                {connecting === wallet.key && <Spinner size="sm" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
