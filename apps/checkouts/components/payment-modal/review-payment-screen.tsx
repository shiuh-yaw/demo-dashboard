"use client";

import { useState } from "react";
import { cn } from "@dynamic-demos/utils";
import { ThumbsUpIcon } from "@/components/icons";
import { type WidgetMode } from "@/lib/widget-config";
import { Button } from "@dynamic-demos/ui";
import { truncateAddress } from "@/lib/format";
import { DYNAMIC_ICON_URL } from "@/lib/dynamicClient";
import ScreenHeader from "./screen-header";
import TokenConversionCard, { type TokenInfo } from "./token-conversion-card";

interface FeeBreakdown {
  /** USD display value (e.g., "$0.50") */
  usd: string;
  /** Token display value (e.g., "0.000608 BNB") */
  token: string;
}

interface ReviewPaymentScreenProps {
  mode: WidgetMode;
  sourceToken: TokenInfo;
  destinationToken?: TokenInfo;
  /** Destination wallet address (e.g., for embedded wallet deposits) */
  destinationAddress?: string;
  itemTotal: FeeBreakdown;
  networkFee: FeeBreakdown;
  totalAmount: FeeBreakdown;
  /** Whether a swap is being executed */
  isExecuting?: boolean;
  /** Error message from swap execution */
  error?: string | null;
  onBack?: () => void;
  onClose?: () => void;
  onConfirm?: () => void;
  onClearError?: () => void;
}

/**
 * Fee row component - displays a label and clickable value
 * Clicking toggles between USD and token display
 */
function FeeRow({
  label,
  value,
  onToggle,
  isTotal = false,
}: {
  label: string;
  value: string;
  onToggle: () => void;
  isTotal?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-(--brand-muted) tracking-[-0.12px] leading-[18px]">
        {label}
      </span>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "text-xs font-medium tracking-[-0.12px] leading-[18px]",
          "hover:opacity-80 transition-colors cursor-pointer",
          isTotal ? "text-(--brand-fg)" : "text-(--brand-muted)",
        )}
        title="Click to toggle USD/token view"
      >
        {value}
      </button>
    </div>
  );
}

export default function ReviewPaymentScreen({
  mode,
  sourceToken,
  destinationToken,
  destinationAddress,
  itemTotal,
  networkFee,
  totalAmount,
  isExecuting = false,
  error,
  onBack,
  onClose,
  onConfirm,
  onClearError,
}: ReviewPaymentScreenProps) {
  const [showTokenAmounts, setShowTokenAmounts] = useState(false);

  const actionLabel = mode === "deposit" ? "deposit" : "payment";
  const confirmLabel =
    mode === "deposit" ? "Confirm Deposit" : "Confirm Payment";
  const showConversion =
    destinationToken && destinationToken.symbol !== sourceToken.symbol;

  // Get display values based on toggle
  const displayItemTotal = showTokenAmounts ? itemTotal.token : itemTotal.usd;
  const displayNetworkFee = showTokenAmounts
    ? networkFee.token
    : networkFee.usd;
  const displayTotalAmount = showTokenAmounts
    ? totalAmount.token
    : totalAmount.usd;

  return (
    <div className="flex flex-col">
      <ScreenHeader
        icon={<ThumbsUpIcon size={18} className="text-(--brand-fg)" />}
        title={`Review your ${actionLabel}`}
        subtitle={
          showConversion
            ? `You're ${mode === "deposit" ? "depositing" : "paying"} with ${
                sourceToken.symbol
              }. We'll automatically convert it to ${destinationToken.symbol}.`
            : `You're ${mode === "deposit" ? "depositing" : "paying"} with ${
                sourceToken.symbol
              }. Your ${actionLabel} will be processed instantly.`
        }
        onClose={onClose}
      />

      {/* Token Conversion Section */}
      <div className="p-3 border-b border-(--brand-border)">
        <TokenConversionCard
          sourceToken={sourceToken}
          destinationToken={destinationToken}
        />
      </div>

      {/* Destination Address (for embedded wallet deposits) */}
      {destinationAddress && (
        <div className="p-3 border-b border-(--brand-border)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-(--brand-muted) tracking-[-0.12px] leading-[18px]">
              Destination
            </span>
            <div className="flex items-center gap-1.5">
              <img
                src={DYNAMIC_ICON_URL}
                alt="Embedded Wallet"
                className="w-4 h-4"
              />
              <span className="text-xs font-medium text-(--brand-fg) tracking-[-0.12px] leading-[18px]">
                {truncateAddress(destinationAddress)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Fee Breakdown - click any amount to toggle USD/token view */}
      <div className="p-3 border-b border-(--brand-border)">
        <div className="flex flex-col gap-[7px]">
          <FeeRow
            label="Item total"
            value={displayItemTotal}
            onToggle={() => setShowTokenAmounts(!showTokenAmounts)}
          />
          <FeeRow
            label="Fee"
            value={displayNetworkFee}
            onToggle={() => setShowTokenAmounts(!showTokenAmounts)}
          />
          <div className="border-t border-dashed border-(--brand-border)" />
          <FeeRow
            label={mode === "deposit" ? "Total" : "Payment fee"}
            value={displayTotalAmount}
            onToggle={() => setShowTokenAmounts(!showTokenAmounts)}
            isTotal
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-3 pt-3">
          <div className="flex items-center justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-(--brand-radius)">
            <span className="text-sm text-red-600">{error}</span>
            {onClearError && (
              <button
                type="button"
                onClick={onClearError}
                className="text-sm text-red-600 hover:text-red-800 underline cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer Buttons */}
      <div className="flex gap-[7px] p-3">
        <Button
          variant="secondary"
          onClick={onBack}
          disabled={isExecuting}
          className="flex-1"
        >
          Back
        </Button>
        <Button onClick={onConfirm} disabled={isExecuting} className="flex-1">
          {isExecuting ? "Processing..." : confirmLabel}
        </Button>
      </div>
    </div>
  );
}

export type { TokenInfo, FeeBreakdown };
