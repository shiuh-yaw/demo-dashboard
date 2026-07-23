"use client";

/**
 * Awaiting-funds screen: QR + copyable amount + copyable address +
 * polling indicator. No signing step - Dynamic detects the inbound
 * transfer and the host's poll advances the screen.
 *
 * The amount row copies the FULL-precision decimal (not the 6-decimal
 * display value) - an under-paid deposit is never detected.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { QrSurface } from "@dynamic-demos/checkouts-widget";
import {
  rawAmountToDecimal,
  depositAddressSendTitle,
  type DepositAddressSourceOption,
} from "@/lib/deposit-address";

interface DepositAddressAwaitingProps {
  option: DepositAddressSourceOption;
  depositAddress: string;
  /** Raw base-unit amount from the quote; user must send exactly this. */
  fromAmount?: string;
  onCancel: () => void;
}

function CopyRow({ value, display }: { value: string; display: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context) - the
      // row text is selectable as the fallback.
    }
  }, [value]);

  return (
    <div className="flex items-center gap-2 rounded-[var(--brand-radius,12px)] bg-[var(--brand-row-bg,#f6f8fa)] px-3 py-2.5">
      <code className="flex-1 text-[11px] text-[var(--brand-fg,#0e121b)] break-all select-all">
        {display}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 text-[11px] font-medium text-[var(--brand-accent,#0050ff)] hover:opacity-80 transition-opacity cursor-pointer"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function DepositAddressAwaiting({
  option,
  depositAddress,
  fromAmount,
  onCancel,
}: DepositAddressAwaitingProps) {
  const exactAmount = fromAmount
    ? rawAmountToDecimal(fromAmount, option.tokenDecimals)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <QrSurface
        value={depositAddress}
        title={depositAddressSendTitle(option)}
        iconUrl={option.logoURI}
        caption={
          exactAmount
            ? "Send the exact amount below to this address from any wallet or exchange."
            : `Send ${option.symbol} to this address from any wallet or exchange.`
        }
        onBack={onCancel}
        backLabel="Cancel deposit"
      />

      <div className="flex flex-col gap-1.5">
        {exactAmount && (
          <CopyRow
            value={exactAmount}
            display={`${exactAmount} ${option.symbol}`}
          />
        )}
        <CopyRow value={depositAddress} display={depositAddress} />
      </div>

      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-accent,#0050ff)] opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-accent,#0050ff)]" />
        </span>
        <span className="text-xs text-[var(--brand-muted,#99a0ae)]">
          Waiting for funds - detection is automatic, no signing needed.
        </span>
      </div>
    </div>
  );
}
