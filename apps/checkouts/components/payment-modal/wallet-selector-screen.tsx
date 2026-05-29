"use client";

/**
 * WalletSelectorScreen
 *
 * The wallet selection screen for the payment modal.
 *
 * Flows:
 * 1. Select a wallet -> if multi-chain, select chain -> connect
 * 2. Select WalletConnect -> select wallet from catalog -> QR code / deep link
 */

import { useEffect, useState } from "react";
import {
  getAvailableWalletProvidersData,
  connectAndVerifyWithWalletProvider,
  connectAndVerifyWithWalletConnectEvm,
  getWalletConnectCatalog,
  getInitStatus,
  waitForClientInitialized,
  onEvent,
  type WalletProviderData,
  type WalletConnectCatalogWallet,
} from "@/lib/dynamicClient";
import { Skeleton, ListRow } from "@dynamic-demos/ui";
import {
  InfoBox,
  ErrorBanner,
  type ErrorInfo,
} from "@dynamic-demos/checkouts-widget";
import WcQrView, {
  isMobileDevice,
  getDeepLink,
  buildDeepLinkUri,
} from "./wc-qr-view";
import WcCatalogList from "./wc-catalog-list";
import { cn } from "@dynamic-demos/utils";
import { CHAIN_ICONS, POPULAR_WALLETS } from "@/lib/config";
import type { ExchangeProvider } from "@/lib/exchanges";

// =============================================================================
// CONSTANTS
// =============================================================================

const WALLETCONNECT_ICON = "https://avatars.githubusercontent.com/u/37784886";

// =============================================================================
// TYPES
// =============================================================================

interface WalletSelectorScreenProps {
  /** Called when a wallet is successfully connected */
  onSuccess?: () => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Called when navigating to chain selection (for modal header back button) */
  onNavigateToChainSelect?: (wallet: WalletGroup) => void;
  /** Called when navigating back from chain selection */
  onNavigateBackFromChainSelect?: () => void;
  /** Currently selected wallet for chain selection (null = wallet list view) */
  selectedWalletForChain?: WalletGroup | null;
  /** Called when WalletConnect state changes. Parent should use the cancel function for back button. */
  onWalletConnectStateChange?: (
    isActive: boolean,
    cancelFn: (() => void) | null,
  ) => void;
  /** Exchange providers to show as funding options */
  exchanges?: ExchangeProvider[];
  /** Called when an exchange is selected */
  onExchangeSelect?: (exchange: ExchangeProvider) => void;
}

export interface WalletGroup {
  key: string;
  displayName: string;
  iconUrl?: string;
  providers: WalletProviderData[];
}

/** WalletConnect sub-flow state machine */
// NOTE: chainSelect step is defined but currently skipped (goes straight to EVM walletList)
// because Solana WalletConnect runtime isn't shipped in SDK v0.6.0.
// Re-enable chainSelect once the SDK builds the walletConnect entry for Solana.
type WcFlowState =
  | { step: "idle" }
  | { step: "chainSelect" }
  | {
      step: "walletList";
      chain: "EVM" | "SOL";
      wallets: WalletConnectCatalogWallet[];
    }
  | {
      step: "qrCode";
      chain: "EVM" | "SOL";
      wallet: WalletConnectCatalogWallet;
      uri: string;
    };

// =============================================================================
// HELPERS
// =============================================================================

function getErrorInfo(error: unknown): ErrorInfo {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : "";

  if (
    errorName.includes("WalletAlreadyLinkedToAnotherUser") ||
    errorMessage.includes("already linked to another user") ||
    errorMessage.includes("already used by another account")
  ) {
    return {
      title: "Wallet Already Linked",
      message:
        "This wallet is already linked to a different account. Unlink it from that account first, or use a different wallet.",
      type: "error",
    };
  }

  if (
    errorMessage.includes("User rejected") ||
    errorMessage.includes("user rejected") ||
    errorMessage.includes("User denied") ||
    errorMessage.includes("rejected the request")
  ) {
    return {
      title: "Signature Cancelled",
      message:
        "You cancelled the signature request. Please try again and sign the message to verify your wallet.",
      type: "warning",
    };
  }

  if (
    errorMessage.includes("not connected") ||
    errorMessage.includes("disconnected")
  ) {
    return {
      title: "Wallet Disconnected",
      message: "The wallet was disconnected. Please try connecting again.",
      type: "warning",
    };
  }

  if (errorMessage.includes("422") || errorMessage.includes("Unprocessable")) {
    return {
      title: "Connection Failed",
      message:
        "There was a problem verifying your wallet. This wallet may already be linked to another account.",
      type: "error",
    };
  }

  return {
    title: "Connection Error",
    message:
      "Something went wrong while connecting your wallet. Please try again.",
    type: "error",
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function WalletSelectorScreen({
  onSuccess,
  onError,
  onNavigateToChainSelect,
  selectedWalletForChain,
  onWalletConnectStateChange,
  exchanges = [],
  onExchangeSelect,
}: WalletSelectorScreenProps) {
  const [providers, setProviders] = useState<WalletProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<ErrorInfo | null>(null);

  // WalletConnect sub-flow state
  const [wcFlow, setWcFlow] = useState<WcFlowState>({ step: "idle" });
  const [catalogLoading, setCatalogLoading] = useState(false);

  // ===========================================================================
  // WALLETCONNECT STATE CHANGE NOTIFICATION
  // ===========================================================================

  // Notify parent when WC flow is active (any step beyond idle)
  useEffect(() => {
    const isActive = wcFlow.step !== "idle";
    if (isActive) {
      const handleBack = () => {
        switch (wcFlow.step) {
          case "qrCode":
            setConnecting(null);
            fetchCatalogForChain(wcFlow.chain);
            break;
          case "walletList":
            // TODO: Go to chainSelect once Solana WC is available
            setWcFlow({ step: "idle" });
            break;
          case "chainSelect":
            setWcFlow({ step: "idle" });
            break;
        }
      };
      onWalletConnectStateChange?.(true, handleBack);
    } else {
      onWalletConnectStateChange?.(false, null);
    }
  }, [wcFlow.step, onWalletConnectStateChange]);

  // ===========================================================================
  // MOBILE DEEP LINK: walletConnectUserActionRequested
  // ===========================================================================

  useEffect(() => {
    if (wcFlow.step !== "qrCode") return;
    if (!isMobileDevice()) return;

    const deepLink = getDeepLink(wcFlow.wallet);
    if (!deepLink) return;

    const unsubscribe = onEvent({
      event: "walletConnectUserActionRequested",
      listener: () => {
        window.location.href = deepLink;
      },
    });

    return unsubscribe;
  }, [wcFlow]);

  // ===========================================================================
  // PROVIDER FETCHING
  // ===========================================================================

  useEffect(() => {
    let isMounted = true;

    const fetchProviders = () => {
      try {
        const availableProviders = getAvailableWalletProvidersData();
        if (isMounted) {
          setProviders(availableProviders || []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching wallet providers:", err);
        if (isMounted) {
          setProviders([]);
          setLoading(false);
        }
      }
    };

    const initStatus = getInitStatus();
    if (initStatus === "finished") {
      fetchProviders();
    } else {
      waitForClientInitialized().then(() => {
        if (isMounted) fetchProviders();
      });
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  const clearError = () => setError(null);

  const handleConnect = async (walletProviderKey: string) => {
    setConnecting(walletProviderKey);
    setError(null);

    try {
      await connectAndVerifyWithWalletProvider({ walletProviderKey });
      onSuccess?.();
    } catch (err) {
      console.error("Error connecting wallet:", err);
      const errorInfo = getErrorInfo(err);
      setError(errorInfo);
      onError?.(err instanceof Error ? err : new Error(errorInfo.message));
    } finally {
      setConnecting(null);
    }
  };

  const handleWalletSelect = (wallet: WalletGroup) => {
    setError(null);
    if (wallet.providers.length === 1 && wallet.providers[0]) {
      handleConnect(wallet.providers[0].key);
    } else {
      onNavigateToChainSelect?.(wallet);
    }
  };

  const handleWalletConnectSelect = () => {
    setError(null);
    // Skip chain selector and go straight to EVM wallet list
    // TODO: Show chainSelect step once Solana WalletConnect is available in the SDK
    fetchCatalogForChain("EVM");
  };

  const fetchCatalogForChain = async (chain: "EVM" | "SOL") => {
    setCatalogLoading(true);
    setError(null);

    try {
      const catalog = await getWalletConnectCatalog();
      const chainFilter = chain === "SOL" ? "SOL" : "EVM";
      const wallets = Object.values(catalog.wallets).filter(
        (w) => w.chain === chainFilter,
      );
      setWcFlow({ step: "walletList", chain, wallets });
    } catch (err) {
      console.error("Error fetching WalletConnect catalog:", err);
      setError({
        title: "Failed to Load Wallets",
        message: "Could not load the wallet list. Please try again.",
        type: "error",
      });
      setWcFlow({ step: "chainSelect" });
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleWcChainSelect = (chain: "EVM" | "SOL") => {
    fetchCatalogForChain(chain);
  };

  const handleWcWalletSelect = async (wallet: WalletConnectCatalogWallet) => {
    setConnecting(`wc:${wallet.name}`);
    setError(null);

    const chain = wcFlow.step === "walletList" ? wcFlow.chain : "EVM";

    try {
      // TODO: Use connectAndVerifyWithWalletConnectSolana for SOL chain once SDK ships runtime
      const result = await connectAndVerifyWithWalletConnectEvm();

      if (result?.uri) {
        setWcFlow({ step: "qrCode", chain, wallet, uri: result.uri });

        if (isMobileDevice()) {
          const deepLink = getDeepLink(wallet);
          if (deepLink) {
            window.location.href = buildDeepLinkUri(deepLink, result.uri);
          }
        }

        await result.approval();
        setWcFlow({ step: "idle" });
        onSuccess?.();
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setWcFlow({ step: "idle" });
      const errorInfo = getErrorInfo(err);
      setError(errorInfo);
      onError?.(err instanceof Error ? err : new Error(errorInfo.message));
    } finally {
      setConnecting(null);
    }
  };

  // ===========================================================================
  // DERIVED DATA
  // ===========================================================================

  const walletGroups: WalletGroup[] = Object.values(
    providers.reduce(
      (acc, provider) => {
        const groupKey =
          provider.groupKey || provider.key.replace(/evm$|sol$/, "");
        if (!acc[groupKey]) {
          acc[groupKey] = {
            key: groupKey,
            displayName: provider.metadata?.displayName || groupKey,
            iconUrl: provider.metadata?.icon,
            providers: [],
          };
        }
        acc[groupKey].providers.push(provider);
        return acc;
      },
      {} as Record<string, WalletGroup>,
    ),
  );

  // ===========================================================================
  // RENDER HELPERS
  // ===========================================================================

  /** Render exchange rows — shared between main list and no-wallets fallback */
  const renderExchangeRows = () =>
    exchanges.map((exchange) => {
      const IconComponent = exchange.iconComponent;
      return (
        <ListRow
          key={exchange.key}
          label={exchange.name}
          iconUrl={exchange.iconUrl}
          icon={
            IconComponent ? (
              <IconComponent className="w-full h-full" />
            ) : undefined
          }
          isLoading={connecting === `exchange:${exchange.key}`}
          loadingText="Connecting..."
          disabled={connecting !== null}
          onClick={() => {
            setConnecting(`exchange:${exchange.key}`);
            onExchangeSelect?.(exchange);
          }}
        />
      );
    });

  // ===========================================================================
  // RENDER
  // ===========================================================================

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-[43px] w-full rounded-(--brand-radius)" />
        <Skeleton className="h-[43px] w-full rounded-(--brand-radius)" />
      </div>
    );
  }

  // WalletConnect QR Code / Mobile Waiting
  if (wcFlow.step === "qrCode") {
    return <WcQrView wallet={wcFlow.wallet} uri={wcFlow.uri} />;
  }

  // WalletConnect Wallet Catalog
  if (wcFlow.step === "walletList") {
    return (
      <WcCatalogList
        wallets={wcFlow.wallets}
        connecting={connecting}
        error={error}
        onClearError={clearError}
        onSelectWallet={handleWcWalletSelect}
      />
    );
  }

  // WalletConnect Chain Selector
  if (wcFlow.step === "chainSelect") {
    if (catalogLoading) {
      return (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-[70px] w-full rounded-(--brand-radius)" />
          <Skeleton className="h-[43px] w-full rounded-(--brand-radius)" />
          <Skeleton className="h-[43px] w-full rounded-(--brand-radius)" />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        <ErrorBanner error={error} onDismiss={clearError} />

        <InfoBox
          iconUrl={WALLETCONNECT_ICON}
          iconAlt="WalletConnect"
          message="Select a network to browse compatible wallets."
        />

        <div className="flex flex-col gap-1.5">
          <ListRow
            label="EVM"
            iconUrl={CHAIN_ICONS["EVM"]}
            iconRounded
            onClick={() => handleWcChainSelect("EVM")}
          />
          <ListRow
            label="Solana"
            iconUrl={CHAIN_ICONS["SOL"]}
            iconRounded
            onClick={() => handleWcChainSelect("SOL")}
          />
        </div>
      </div>
    );
  }

  // No installed wallets fallback
  if (providers.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <ErrorBanner error={error} onDismiss={clearError} />

        <ListRow
          label="WalletConnect"
          iconUrl={WALLETCONNECT_ICON}
          isLoading={connecting === "walletconnect"}
          loadingText="Connecting..."
          disabled={connecting !== null}
          onClick={handleWalletConnectSelect}
        />

        {/* Exchange funding options (alongside available options) */}
        {renderExchangeRows()}

        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px bg-(--brand-border)" />
          <span className="text-[10px] text-(--brand-muted) uppercase tracking-wider">
            or install
          </span>
          <div className="flex-1 h-px bg-(--brand-border)" />
        </div>

        {POPULAR_WALLETS.map((wallet) => (
          <a
            key={wallet.name}
            href={wallet.installUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "w-full h-[43px] flex items-center justify-between",
              "bg-(--brand-row-bg) rounded-(--brand-radius)",
              "pl-3 pr-2.5 py-1",
              "transition-all duration-150",
              "hover:bg-(--brand-row-hover) active:opacity-80",
              "cursor-pointer no-underline",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 shrink-0 rounded-lg overflow-hidden">
                <img
                  src={wallet.iconUrl}
                  alt={wallet.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-sm font-medium text-(--brand-fg) tracking-[-0.14px] leading-5">
                {wallet.name}
              </span>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-(--brand-accent)/10 text-(--brand-accent)">
              Install
            </span>
          </a>
        ))}
      </div>
    );
  }

  // Chain selection for multi-chain wallets (e.g. Phantom)
  if (selectedWalletForChain) {
    return (
      <div className="flex flex-col gap-3">
        <ErrorBanner error={error} onDismiss={clearError} />

        <InfoBox
          iconUrl={selectedWalletForChain.iconUrl}
          iconAlt={selectedWalletForChain.displayName}
          message={`${selectedWalletForChain.displayName} supports multiple chains, so select your preferred chain to connect with.`}
        />

        <div className="flex flex-col gap-1.5">
          {selectedWalletForChain.providers.map((provider) => {
            const chainName =
              provider.chain === "SOL" ? "Solana" : provider.chain || "Unknown";
            const chainIcon = provider.chain
              ? CHAIN_ICONS[provider.chain]
              : undefined;
            return (
              <ListRow
                key={provider.key}
                label={chainName}
                iconUrl={chainIcon}
                iconRounded
                isLoading={connecting === provider.key}
                loadingText="Connecting..."
                disabled={connecting !== null}
                onClick={() => handleConnect(provider.key)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Main wallet list
  return (
    <div className="flex flex-col gap-1.5">
      <ErrorBanner error={error} onDismiss={clearError} />

      {walletGroups.map((wallet) => {
        const isConnecting = wallet.providers.some((p) => connecting === p.key);

        return (
          <ListRow
            key={wallet.key}
            label={wallet.displayName}
            iconUrl={wallet.iconUrl}
            isLoading={isConnecting}
            loadingText="Connecting..."
            disabled={connecting !== null}
            onClick={() => handleWalletSelect(wallet)}
            rightContent={
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-[30px] bg-(--brand-row-hover,#eef1f1)">
                <div className="w-1.5 h-1.5 rounded-full bg-(--brand-accent,#4779ff)" />
                <span className="text-[11px] font-medium text-(--brand-muted,#9a9a9a) leading-4">
                  Installed
                </span>
              </div>
            }
          />
        );
      })}

      {/* Exchange funding options (alongside installed wallets) */}
      {renderExchangeRows()}

      {(walletGroups.length > 0 || exchanges.length > 0) && (
        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px bg-(--brand-border)" />
          <span className="text-[10px] text-(--brand-muted) uppercase tracking-wider">
            or
          </span>
          <div className="flex-1 h-px bg-(--brand-border)" />
        </div>
      )}

      <ListRow
        label="WalletConnect"
        iconUrl={WALLETCONNECT_ICON}
        isLoading={connecting === "walletconnect"}
        loadingText="Connecting..."
        disabled={connecting !== null}
        onClick={handleWalletConnectSelect}
      />
    </div>
  );
}
