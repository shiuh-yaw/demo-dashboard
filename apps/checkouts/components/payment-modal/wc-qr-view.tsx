"use client";

/**
 * WcQrView
 *
 * WalletConnect connection view:
 * - Desktop: QR code branded with the selected wallet's icon
 * - Mobile: Waiting state with "Open wallet" button (deep link already triggered)
 */

import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import { QRCodeSVG } from "qrcode.react";
import type { WalletConnectCatalogWallet } from "@/lib/dynamicClient";

// =============================================================================
// CONSTANTS
// =============================================================================

const WALLETCONNECT_ICON = "https://avatars.githubusercontent.com/u/37784886";

// =============================================================================
// HELPERS
// =============================================================================

/** Detect if running on a mobile device */
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/** Get the best deep link for a wallet */
export function getDeepLink(wallet: WalletConnectCatalogWallet): string | null {
  return wallet.deeplinks?.native || wallet.deeplinks?.universal || null;
}

/** Build deep link URI with WalletConnect URI appended */
export function buildDeepLinkUri(deepLink: string, wcUri: string): string {
  const separator = deepLink.includes("?") ? "&" : "?";
  return `${deepLink}${separator}uri=${encodeURIComponent(wcUri)}`;
}

export { isMobileDevice };

// =============================================================================
// TYPES
// =============================================================================

interface WcQrViewProps {
  /** The selected catalog wallet */
  wallet: WalletConnectCatalogWallet;
  /** WalletConnect URI for QR code */
  uri: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function WcQrView({ wallet, uri }: WcQrViewProps) {
  const [copied, setCopied] = useState(false);
  const mobile = isMobileDevice();

  const handleCopyUri = async () => {
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy URI");
    }
  };

  // Mobile: show waiting state (deep link already opened the wallet)
  if (mobile) {
    const deepLink = getDeepLink(wallet);

    return (
      <div className="flex flex-col items-center gap-4 py-4">
        {wallet.spriteUrl && (
          <div className="w-14 h-14 shrink-0">
            <img
              src={wallet.spriteUrl}
              alt={wallet.name}
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        )}

        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-(--brand-fg)">
            Continue in {wallet.name}
          </p>
          <p className="text-xs text-(--brand-muted)">
            Approve the connection in your wallet app
          </p>
        </div>

        <Loader2 className="w-5 h-5 text-(--brand-muted) animate-spin" />

        {deepLink && (
          <button
            type="button"
            onClick={() =>
              (window.location.href = buildDeepLinkUri(deepLink, uri))
            }
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
              "text-xs font-medium",
              "bg-(--brand-row-bg) hover:bg-(--brand-row-hover)",
              "text-(--brand-muted) hover:text-(--brand-fg)",
              "transition-all duration-150 cursor-pointer",
              "border border-(--brand-border)",
            )}
          >
            Open {wallet.name}
          </button>
        )}
      </div>
    );
  }

  // Desktop: show QR code
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-3 rounded-xl">
        <QRCodeSVG
          value={uri}
          size={180}
          level="L"
          imageSettings={{
            src: wallet.spriteUrl || WALLETCONNECT_ICON,
            x: undefined,
            y: undefined,
            height: 36,
            width: 36,
            excavate: true,
          }}
        />
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-(--brand-fg)">
          Scan with {wallet.name}
        </p>
        <p className="text-xs text-(--brand-muted)">
          Open {wallet.name} and scan this code
        </p>
      </div>

      <button
        type="button"
        onClick={handleCopyUri}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
          "text-xs font-medium",
          "bg-(--brand-row-bg) hover:bg-(--brand-row-hover)",
          "text-(--brand-muted) hover:text-(--brand-fg)",
          "transition-all duration-150 cursor-pointer",
          "border border-(--brand-border)",
        )}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-green-500" />
            <span className="text-green-600">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            Copy link
          </>
        )}
      </button>
    </div>
  );
}
