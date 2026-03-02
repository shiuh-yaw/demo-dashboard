"use client";

/**
 * Pending Screen Component
 *
 * Displays transaction pending state with a link to view the transaction.
 * Shown when a transaction is submitted and waiting for confirmation.
 * Polls for status updates every 5 seconds.
 *
 * @module components/payment-widget/screens/pending-screen
 */

import { useEffect, useRef } from "react";
import { WidgetCard } from "@dynamic-demos/ui";
import ScreenHeader from "@/components/payment-modal/screen-header";
import { Button } from "@dynamic-demos/ui";
import { Loader2, ExternalLink } from "lucide-react";
import { CashIcon } from "@/components/icons";
import type { WidgetConfig } from "@/lib/widget-config";
import { Status } from "@/lib/types";
import { getTransactionStatus } from "@/lib/api/transactions";

// =============================================================================
// TYPES
// =============================================================================

export interface PendingScreenProps {
  /** Checkout ID */
  checkoutId: string;
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

export function PendingScreen({
  checkoutId,
  transactionId,
  explorerUrl,
  config,
  isTransitioning,
  onClose,
}: PendingScreenProps) {
  const actionLabel = config.mode === "deposit" ? "Deposit" : "Payment";
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for transaction status updates every 3 seconds
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const result = await getTransactionStatus(checkoutId, transactionId);

        if (result.error) return;

        if (!result.data) return;

        const status = result.data.status;

        // If transaction is confirmed, stop polling and reload page to show completion screen
        if (status === Status.CONFIRMED) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          // Reload page to show completion screen when confirmed
          window.location.reload();
          return;
        }
        // If transaction failed or was cancelled, stop polling
        if (status === Status.FAILED || status === Status.CANCELLED) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (error) {
        // Silently handle errors - polling will retry on next interval
      }
    };

    // Poll immediately, then every 5 seconds
    pollStatus();
    pollingIntervalRef.current = setInterval(pollStatus, 5000);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [checkoutId, transactionId]);

  return (
    <WidgetCard isTransitioning={isTransitioning}>
      <div className="flex flex-col">
        <ScreenHeader
          icon={<CashIcon size={18} className="text-(--widget-fg)" />}
          title={`${actionLabel} Pending`}
          onClose={onClose}
        />

        {/* Pending Message */}
        <div className="p-3 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-(--widget-fg) mb-1">
              Transaction pending confirmation
            </p>
            <p className="text-xs text-(--widget-muted)">
              Your {actionLabel.toLowerCase()} is being processed on the
              blockchain
            </p>
          </div>
        </div>

        {/* Transaction Info */}
        {transactionId && (
          <div className="px-3 pb-3">
            <div className="border border-(--widget-border) rounded-(--widget-radius) p-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-(--widget-muted)">
                  Transaction ID
                </span>
                <span className="text-xs font-mono text-(--widget-fg) break-all">
                  {transactionId}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-3 border-t border-(--widget-border)">
          <div className="flex gap-2">
            {explorerUrl && (
              <Button
                variant="secondary"
                onClick={() => window.open(explorerUrl, "_blank")}
                className="flex-1 gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Transaction
              </Button>
            )}
            {onClose && (
              <Button onClick={onClose} className="flex-1">
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
