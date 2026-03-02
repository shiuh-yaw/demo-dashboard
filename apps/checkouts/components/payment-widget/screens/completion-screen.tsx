"use client";

/**
 * Completion Screen Component
 *
 * Displays transaction completion state with a link to view the transaction.
 * Shown when a transaction with externalId already exists and is confirmed.
 *
 * @module components/payment-widget/screens/completion-screen
 */

import { useState } from "react";
import { WidgetCard } from "@dynamic-demos/ui";
import ScreenHeader from "@/components/payment-modal/screen-header";
import { Button } from "@dynamic-demos/ui";
import { CheckCircle, ExternalLink, Copy, Check } from "lucide-react";
import type { WidgetConfig } from "@/lib/widget-config";

// =============================================================================
// HELPERS
// =============================================================================

/** Copy text to clipboard */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface CompletionScreenProps {
  /** Transaction ID */
  transactionId: string;
  /** Explorer URL for the transaction */
  explorerUrl?: string;
  /** Widget configuration */
  config: WidgetConfig;
  /** Whether screen is transitioning */
  isTransitioning: boolean;
  /** Called when user closes the screen */
  onClose?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CompletionScreen({
  transactionId,
  explorerUrl,
  config,
  isTransitioning,
  onClose,
}: CompletionScreenProps) {
  const [copied, setCopied] = useState(false);
  const actionLabel = config.mode === "deposit" ? "Deposit" : "Payment";

  const handleCopy = async () => {
    const success = await copyToClipboard(transactionId);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Truncate ID for display
  const truncatedId =
    transactionId.length > 20
      ? `${transactionId.slice(0, 10)}...${transactionId.slice(-8)}`
      : transactionId;

  return (
    <WidgetCard isTransitioning={isTransitioning}>
      <div className="flex flex-col">
        <ScreenHeader
          icon={
            <CheckCircle
              size={18}
              className="text-[#46B463]"
              strokeWidth={1.5}
            />
          }
          title={`${actionLabel} Complete`}
          subtitle={`Your ${actionLabel.toLowerCase()} has been processed`}
          onClose={onClose}
        />

        <div className="p-3 space-y-3">
          {/* Transaction ID */}
          {transactionId && (
            <div className="p-3 bg-(--widget-row-bg) rounded-(--widget-radius)">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-(--widget-muted) tracking-[-0.12px] mb-1">
                    Transaction ID
                  </p>
                  <p className="text-sm font-mono text-(--widget-fg) truncate">
                    {truncatedId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-2 rounded-full hover:bg-black/5 text-(--widget-muted) hover:text-(--widget-fg) transition-colors cursor-pointer shrink-0"
                  aria-label="Copy transaction ID"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-[#46B463]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 h-9 px-3 text-xs font-medium text-(--widget-accent) bg-(--widget-accent)/5 rounded-(--widget-radius) hover:bg-(--widget-accent)/10 transition-colors"
              >
                View on Explorer
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {onClose && (
              <Button variant="secondary" className="w-full" onClick={onClose}>
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
