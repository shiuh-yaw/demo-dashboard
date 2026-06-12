"use client";

import { useState } from "react";
import { cn } from "@dynamic-demos/utils";
import { Button } from "@dynamic-demos/ui";
import { truncateAddress } from "../lib/format";
import ScreenHeader from "./screen-header";
import TokenConversionCard, { type TokenInfo } from "./token-conversion-card";

/**
 * The action noun that drives copy across this screen — any string is
 * accepted (deposit, payment, withdraw, send, …). Common forms have their
 * gerunds spelled out; unknown verbs fall back to a naive `${mode}ing`.
 */
type WidgetMode = string;

const GERUNDS: Record<string, string> = {
  deposit: "depositing",
  payment: "paying",
  withdraw: "withdrawing",
  send: "sending",
  transfer: "transferring",
};
const gerundOf = (mode: string) =>
  GERUNDS[mode.toLowerCase()] ?? `${mode}ing`;
const capitalize = (s: string) =>
  s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);

// Dynamic logo mark as inline SVG data URL — extracted here so the package
// does not depend on apps/checkouts/lib/dynamicClient.ts. Host apps can pass
// their own logo via the `brand.logoUrl` prop on <PaymentWidget /> (Task 6).
const DYNAMIC_ICON_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-1 -2 24 24' fill='%230050FF'%3E%3Cpath d='M9.9 1.5c-.43.4-.85.79-1.27 1.18C6.67 4.5 4.71 6.32 2.75 8.14c-.45.41-.92.81-1.48 1.06-.67.29-1.06.1-1.27-.62-.3-1.01-.14-1.95.44-2.82.5-.74 1.12-1.36 1.76-1.96 1.02-.96 2.05-1.9 3.1-2.83.46-.41.96-.78 1.57-.9C8.69-.31 9.85 1.44 9.9 1.5z'/%3E%3Cpath d='M1.1 10.75c1.11-.32 1.95-1.02 2.76-1.77 2.59-2.36 5.18-4.73 7.78-7.08.57-.52 1.18-1.01 1.81-1.45.81-.55 1.7-.63 2.57-.1.31.19.62.41.88.67.88.92 1.76 1.85 2.61 2.8.91 1 1.8 2.03 2.67 3.07.3.36.54.77.74 1.2.38.78.28 1.56-.18 2.29-.4.65-.95 1.19-1.52 1.7-2.21 2-4.42 3.99-6.65 5.96-.6.53-1.26 1-1.94 1.42-1.28.79-2.57.69-3.74-.24-.68-.55-1.32-1.16-1.9-1.8C5.06 15.34 3.21 13.23 1.4 11.1c-.1-.1-.18-.22-.3-.36z'/%3E%3C/svg%3E";

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

  const actionLabel = mode;
  const confirmLabel = `Confirm ${capitalize(mode)}`;
  const showConversion =
    destinationToken &&
    (destinationToken.symbol !== sourceToken.symbol ||
      (destinationToken.chainId != null &&
        sourceToken.chainId != null &&
        destinationToken.chainId !== sourceToken.chainId));

  // Get display values based on toggle
  const displayItemTotal = showTokenAmounts ? itemTotal.token : itemTotal.usd;
  const displayNetworkFee = showTokenAmounts
    ? networkFee.token
    : networkFee.usd;
  const displayTotalAmount = showTokenAmounts
    ? totalAmount.token
    : totalAmount.usd;

  return (
    <div className="flex flex-col h-full flex-1">
      <ScreenHeader
        eyebrow={mode.toUpperCase()}
        title={`Review your ${actionLabel}`}
        subtitle={
          showConversion && destinationToken
            ? destinationToken.symbol !== sourceToken.symbol
              ? `You're ${gerundOf(mode)} ${itemTotal.usd} with ${sourceToken.symbol}. We'll automatically convert it to ${destinationToken.symbol}.`
              : `You're ${gerundOf(mode)} ${itemTotal.usd} with ${sourceToken.symbol}. We'll route it cross-chain.`
            : `You're ${gerundOf(mode)} ${itemTotal.usd} with ${sourceToken.symbol}.`
        }
        onClose={onClose}
      />

      {/* Token Conversion Section */}
      <div className="px-5 py-3 border-b border-(--brand-border)">
        <TokenConversionCard
          sourceToken={sourceToken}
          destinationToken={destinationToken}
        />
      </div>

      {/* Destination Address (for embedded wallet deposits) */}
      {destinationAddress && (
        <div className="px-5 py-3 border-b border-(--brand-border)">
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
      <div className="px-5 py-3 border-b border-(--brand-border)">
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
            label="Total"
            value={displayTotalAmount}
            onToggle={() => setShowTokenAmounts(!showTokenAmounts)}
            isTotal
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-5 pt-3">
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

      {/* Spacer — push the footer buttons to the bottom of the card when
          the host container is taller than our natural content (e.g. when
          the host applies a min-h or sizes via flex). */}
      <div className="flex-1" />

      {/* Footer Buttons */}
      <div className="flex gap-[7px] px-5 py-3">
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
