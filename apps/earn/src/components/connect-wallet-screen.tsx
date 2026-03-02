"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getAvailableWalletProviders,
  connectAndVerifyWithWalletProvider,
  waitForClientInitialized,
  connectWithWalletConnect,
  type WalletProviderData,
} from "@/lib/dynamic";
import { QRCodeSVG } from "qrcode.react";
import { Link2, Check } from "lucide-react";

export interface WalletGroup {
  key: string;
  displayName: string;
  iconUrl?: string;
  providers: WalletProviderData[];
}

interface ErrorInfo {
  title: string;
  message: string;
  type: "error" | "warning";
}

function getErrorInfo(error: unknown): ErrorInfo {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : "";

  if (
    errorName.includes("WalletAlreadyLinkedToAnotherUser") ||
    errorMessage.includes("already linked to another user")
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
    errorMessage.includes("User denied")
  ) {
    return {
      title: "Signature Cancelled",
      message:
        "You cancelled the signature request. Please try again and sign the message to verify your wallet.",
      type: "warning",
    };
  }

  return {
    title: "Connection Error",
    message:
      "Something went wrong while connecting your wallet. Please try again.",
    type: "error",
  };
}

interface ConnectWalletScreenProps {
  title?: string;
  subtitle?: string;
  onSuccess?: () => void;
  /** Called on error - receives title and message for display */
  onError?: (title: string, message: string, type: "error" | "warning") => void;
  /** Called to clear any displayed error */
  onClearError?: () => void;
  onBack?: () => void;
  onClose?: () => void;
  selectedWalletForChain?: WalletGroup | null;
  onNavigateToChainSelect?: (wallet: WalletGroup) => void;
  /** Called when WalletConnect mode changes - parent can use this to update header/back behavior */
  onWalletConnectModeChange?: (isActive: boolean) => void;
  /** If true, parent is handling back from WalletConnect - triggers exit from WalletConnect mode */
  exitWalletConnect?: boolean;
}

export default function ConnectWalletScreen({
  title = "Connect Wallet",
  subtitle = "Choose how you would like to connect",
  onSuccess,
  onError,
  onClearError,
  onBack,
  onClose,
  selectedWalletForChain,
  onNavigateToChainSelect,
  onWalletConnectModeChange,
  exitWalletConnect,
}: ConnectWalletScreenProps) {
  const [providers, setProviders] = useState<WalletProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  // WalletConnect state
  const [showWalletConnect, setShowWalletConnect] = useState(false);
  const [walletConnectUri, setWalletConnectUri] = useState<string | null>(null);
  const [walletConnectError, setWalletConnectError] = useState<string | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  // Handle parent requesting exit from WalletConnect mode
  useEffect(() => {
    if (exitWalletConnect && showWalletConnect) {
      setShowWalletConnect(false);
      setWalletConnectUri(null);
      setWalletConnectError(null);
      setCopied(false);
      onWalletConnectModeChange?.(false);
    }
  }, [exitWalletConnect, showWalletConnect, onWalletConnectModeChange]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        await waitForClientInitialized();
        const availableProviders = getAvailableWalletProviders();
        setProviders(availableProviders || []);
      } catch (err) {
        // Error fetching providers - set empty array
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  const initiateWalletConnect = useCallback(async () => {
    setWalletConnectError(null);
    setWalletConnectUri(null);
    setCopied(false);

    try {
      const { uri, approval } = await connectWithWalletConnect(true);
      setWalletConnectUri(uri);

      // Wait for approval from the wallet
      await approval();
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setWalletConnectError(message);
    }
  }, [onSuccess]);

  const handleWalletConnectClick = () => {
    onClearError?.();
    setShowWalletConnect(true);
    onWalletConnectModeChange?.(true);
    initiateWalletConnect();
  };

  const handleCopyUri = useCallback(() => {
    if (!walletConnectUri) return;

    navigator.clipboard.writeText(walletConnectUri);
    setCopied(true);

    // Clear any existing timeout
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }

    copiedTimeoutRef.current = setTimeout(() => {
      setCopied(false);
      copiedTimeoutRef.current = null;
    }, 2000);
  }, [walletConnectUri]);

  const handleConnect = async (walletProviderKey: string) => {
    setConnecting(walletProviderKey);
    onClearError?.();

    try {
      await connectAndVerifyWithWalletProvider({ walletProviderKey });
      onSuccess?.();
    } catch (err) {
      const errorInfo = getErrorInfo(err);
      onError?.(errorInfo.title, errorInfo.message, errorInfo.type);
    } finally {
      setConnecting(null);
    }
  };

  const handleWalletSelect = (wallet: WalletGroup) => {
    onClearError?.();
    if (wallet.providers.length === 1 && wallet.providers[0]) {
      handleConnect(wallet.providers[0].key);
    } else {
      onNavigateToChainSelect?.(wallet);
    }
  };

  const walletGroups: WalletGroup[] = Object.values(
    providers.reduce((acc, provider) => {
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
    }, {} as Record<string, WalletGroup>)
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-[52px] w-full rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-[52px] w-full rounded-lg bg-gray-100 animate-pulse" />
      </div>
    );
  }

  // WalletConnect QR code screen
  if (showWalletConnect) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="relative">
          {walletConnectUri ? (
            <div className="p-3 bg-white rounded-xl border border-gray-100">
              <QRCodeSVG
                value={walletConnectUri}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>
          ) : walletConnectError ? (
            <div className="w-[224px] h-[224px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-center px-4">
                <p className="text-sm text-red-600 mb-2">
                  {walletConnectError}
                </p>
                <button
                  type="button"
                  onClick={initiateWalletConnect}
                  className="text-sm font-medium text-[#3B99FC] hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <div className="w-[224px] h-[224px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100">
              <div className="w-6 h-6 border-2 border-[#3B99FC] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopyUri}
          disabled={!walletConnectUri}
          className={`flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            copied
              ? "text-green-600"
              : "text-earn-text-secondary hover:text-earn-text-primary"
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4" />
              Copy to clipboard
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {walletGroups.map((wallet) => (
        <button
          key={wallet.key}
          type="button"
          onClick={() => handleWalletSelect(wallet)}
          disabled={connecting !== null}
          className={`flex items-center gap-3 p-3 rounded-lg border border-earn-border/60 hover:bg-gray-50/50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            connecting === wallet.key ? "bg-gray-50" : ""
          }`}
        >
          <div className="w-7 h-7 shrink-0">
            {wallet.iconUrl ? (
              <img
                src={wallet.iconUrl}
                alt={wallet.displayName}
                className="w-full h-full object-contain rounded"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-100" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-earn-text-primary">
              {wallet.displayName}
            </p>
          </div>
          {connecting === wallet.key && (
            <div className="w-4 h-4 border-2 border-earn-text-primary border-t-transparent rounded-full animate-spin" />
          )}
        </button>
      ))}

      {/* WalletConnect Option */}
      <button
        type="button"
        onClick={handleWalletConnectClick}
        disabled={connecting !== null}
        className="flex items-center gap-3 p-3 rounded-lg border border-earn-border/60 hover:bg-gray-50/50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-7 h-7 shrink-0 flex items-center justify-center">
          <WalletConnectIcon className="w-6 h-6" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-earn-text-primary">
            WalletConnect
          </p>
        </div>
      </button>
    </div>
  );
}

// WalletConnect Icon component
function WalletConnectIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 185"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M61.4385 36.2562C104.195 -5.41872 173.805 -5.41872 216.562 36.2562L221.855 41.4285C224.133 43.6495 224.133 47.2634 221.855 49.4845L203.671 67.1611C202.532 68.2717 200.697 68.2717 199.558 67.1611L192.439 60.1983C162.849 31.3568 115.151 31.3568 85.5612 60.1983L77.8946 67.6904C76.7557 68.801 74.9212 68.801 73.7822 67.6904L55.5978 50.0138C53.3196 47.7927 53.3196 44.1788 55.5978 41.9578L61.4385 36.2562ZM253.234 71.9876L269.484 87.7673C271.762 89.9883 271.762 93.6022 269.484 95.8233L196.233 167.258C193.955 169.479 190.286 169.479 188.007 167.258L135.317 115.771C134.748 115.216 133.83 115.216 133.261 115.771L80.5704 167.258C78.2922 169.479 74.6232 169.479 72.345 167.258L-0.983906 95.8233C-3.26209 93.6022 -3.26209 89.9883 -0.983906 87.7673L15.2668 71.9876C17.545 69.7665 21.214 69.7665 23.4921 71.9876L76.1828 123.475C76.7519 124.03 77.6701 124.03 78.2393 123.475L130.929 71.9876C133.208 69.7665 136.877 69.7665 139.155 71.9876L191.845 123.475C192.414 124.03 193.333 124.03 193.902 123.475L246.593 71.9876C248.871 69.7665 252.54 69.7665 254.818 71.9876L253.234 71.9876Z"
        fill="#3B99FC"
      />
    </svg>
  );
}
