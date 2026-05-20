"use client";

/**
 * Kraken Whitelisting Screen
 *
 * Shown after a user connects their Kraken exchange account when their
 * Kraken account enforces address whitelisting. Guides the user through
 * the steps to whitelist the destination wallet address on Kraken so
 * that withdrawals can be sent to it.
 *
 * The "Done" button verifies that the address has actually been whitelisted
 * before proceeding. If not yet whitelisted, it shows an error and the
 * user can try again.
 *
 * Matches Figma design: node 394:5256 (Pay with Crypto file)
 *
 * @module components/payment-modal/kraken-whitelisting-screen
 */

import { useState, useCallback } from "react";
import { ExternalLink, Copy, Check, X } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import { Button } from "@dynamic-demos/ui";
import { KrakenLogo } from "@dynamic-demos/ui";
import { ErrorBanner } from "@dynamic-demos/checkouts-widget";
import type { WhitelistCheckResult } from "@/lib/exchanges";

// =============================================================================
// TYPES
// =============================================================================

interface KrakenWhitelistingScreenProps {
  /** The wallet address that needs to be whitelisted on Kraken */
  walletAddress: string;
  /** Called when the address is verified as whitelisted */
  onDone: () => void;
  /** Called when the user clicks the close (X) button */
  onClose?: () => void;
  /** Verify whitelisting status — called when user clicks Done */
  onVerifyWhitelist: () => Promise<WhitelistCheckResult>;
  /** Kraken website URL to open */
  krakenUrl?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const WHITELISTING_STEPS = [
  "Open Kraken",
  "Click transfer, then withdraw",
  "Whitelist the wallet address below",
  "Complete the first transfer on Kraken",
] as const;

// =============================================================================
// COMPONENT
// =============================================================================

export default function KrakenWhitelistingScreen({
  walletAddress,
  onDone,
  onClose,
  onVerifyWhitelist,
  krakenUrl = "https://www.kraken.com",
}: KrakenWhitelistingScreenProps) {
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [notWhitelisted, setNotWhitelisted] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = walletAddress;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [walletAddress]);

  const handleDone = useCallback(async () => {
    setIsVerifying(true);
    setNotWhitelisted(false);

    try {
      const { isWhitelisted } = await onVerifyWhitelist();
      if (isWhitelisted) {
        onDone();
      } else {
        setNotWhitelisted(true);
      }
    } catch {
      // On error, show not-whitelisted message
      setNotWhitelisted(true);
    } finally {
      setIsVerifying(false);
    }
  }, [onVerifyWhitelist, onDone]);

  return (
    <div
      className={cn(
        "bg-(--brand-surface) text-(--brand-fg) rounded-(--brand-radius-lg) overflow-hidden",
        "border border-(--brand-border)",
        "shadow-[0px_8px_8px_-4px_rgba(10,13,18,0.03),0px_3px_3px_-1.5px_rgba(10,13,18,0.04)]",
      )}
    >
      {/* Section 1: Header — Icon + Title + Close */}
      <div className="flex items-start justify-between p-3 border-b border-(--brand-border)">
        <div className="flex flex-col gap-3 items-start">
          <KrakenLogo
            className={cn(
              "w-[38px] h-[38px] rounded-[9px]",
              "border border-[rgba(153,153,153,0.2)]",
              "shadow-[0px_0px_1px_-1px_rgba(0,0,0,0.04),0px_2px_4px_-1px_rgba(0,0,0,0.07)]",
            )}
          />
          <div className="flex flex-col gap-0.5 max-w-[316px]">
            <p className="text-sm font-medium text-(--brand-fg) tracking-[-0.14px] leading-5">
              Whitelisting Required
            </p>
            <p className="text-xs font-medium text-(--brand-muted) tracking-[-0.12px] leading-[18px]">
              To complete your first transfer with kraken, please follow these
              steps:
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-4 h-4 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
            aria-label="Close"
          >
            <X
              className="w-full h-full text-(--brand-muted)"
              strokeWidth={2}
            />
          </button>
        )}
      </div>

      {/* Section 2: Steps + Wallet Address */}
      <div className="flex flex-col gap-2 p-3 border-b border-(--brand-border)">
        {/* Numbered Steps Card */}
        <div className="border border-(--brand-border) rounded-[10px] flex flex-col gap-3.5 pl-3 pr-2.5 py-3">
          {WHITELISTING_STEPS.map((step, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-[18px] h-[18px] shrink-0 rounded-full border border-[#e1e1e1] flex items-center justify-center">
                <span className="text-[10px] font-medium text-[#121212] tracking-[-0.1px] text-center leading-normal">
                  {index + 1}
                </span>
              </div>
              <span className="text-sm font-medium text-(--brand-fg) tracking-[-0.14px] leading-normal">
                {step}
              </span>
            </div>
          ))}
        </div>

        {/* Wallet Address Card */}
        <div className="border border-(--brand-border) rounded-[10px] flex items-center justify-between pl-3 pr-2 py-2">
          <div className="flex flex-col min-w-0 flex-1 text-xs font-medium tracking-[-0.12px] leading-normal">
            <span className="text-(--brand-muted)">Wallet Address</span>
            <span className="text-(--brand-fg) truncate">{walletAddress}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-[10px] shrink-0 ml-2 shadow-[0px_1px_2px_0px_rgba(24,39,75,0.04)] hover:bg-(--brand-row-hover) transition-colors duration-150 cursor-pointer"
            aria-label="Copy wallet address"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-(--brand-muted)" />
            )}
          </button>
        </div>
      </div>

      {/* Section 3: Action Buttons + Error */}
      <div className="flex flex-col gap-[7px] p-3">
        <ErrorBanner
          error={
            notWhitelisted
              ? {
                  title: "Address Not Whitelisted",
                  message:
                    "The address has not been whitelisted yet. Please complete the steps above and try again.",
                  type: "warning",
                }
              : null
          }
          onDismiss={() => setNotWhitelisted(false)}
        />

        <Button
          variant="secondary"
          className="w-full gap-1.5"
          onClick={() =>
            window.open(krakenUrl, "_blank", "noopener,noreferrer")
          }
        >
          Open Kraken
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>

        <Button className="w-full" onClick={handleDone} disabled={isVerifying}>
          {isVerifying ? "Checking..." : notWhitelisted ? "Try Again" : "Done"}
        </Button>
      </div>
    </div>
  );
}
