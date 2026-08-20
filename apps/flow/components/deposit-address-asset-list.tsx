"use client";

/**
 * Chain + asset picker for the deposit-address source. One step:
 * each option is a (chain, asset) pair because the quote's fromAmount
 * is denominated in the asset the user must send.
 */

import { useState } from "react";
import { cn } from "@dynamic-demos/utils";
import {
  isValidRefundAddress,
  type DepositAddressSourceOption,
} from "@/lib/deposit-address";
import { DrillInHeader } from "./drill-in-header";

interface DepositAddressAssetListProps {
  options: readonly DepositAddressSourceOption[];
  /**
   * `refundAddressOverride` is the operator-supplied refund address from
   * the advanced section, already validated for the option's chain.
   */
  onSelected: (
    option: DepositAddressSourceOption,
    refundAddressOverride?: string,
  ) => void;
  onChangeSource: () => void;
}

export function DepositAddressAssetList({
  options,
  onSelected,
  onChangeSource,
}: DepositAddressAssetListProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [refundAddress, setRefundAddress] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);

  function handleSelected(option: DepositAddressSourceOption) {
    const override = refundAddress.trim();
    if (!override) {
      onSelected(option);
      return;
    }
    if (!isValidRefundAddress(option.chainName, override)) {
      setRefundError(`Not a valid ${option.label} refund address.`);
      return;
    }
    setRefundError(null);
    onSelected(option, override);
  }

  return (
    <div className="flex flex-col gap-4">
      <DrillInHeader title="What will you send?" onBack={onChangeSource} />
      <div className="flex flex-col gap-1.5">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => handleSelected(option)}
            className={cn(
              "w-full h-[52px] flex items-center gap-3",
              "bg-[var(--brand-row-bg,#f6f8fa)] rounded-[var(--brand-radius,12px)]",
              "px-3 py-2",
              "transition-all duration-150",
              "hover:bg-[var(--brand-row-hover,#eef0f3)] active:opacity-80",
              "cursor-pointer",
            )}
          >
            <img
              src={option.logoURI}
              alt=""
              className="w-8 h-8 shrink-0 rounded-full"
            />
            <span className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium text-[var(--brand-fg,#0e121b)] truncate">
                {option.label}
              </span>
              <span className="text-[11px] text-[var(--brand-muted,#99a0ae)]">
                {option.sublabel}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t border-[var(--brand-border,#e5e7eb)] pt-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          aria-controls="deposit-address-advanced"
          className="flex items-center justify-between gap-3 text-left cursor-pointer group"
        >
          <span className="text-[13px] text-[var(--brand-muted,#99a0ae)]">
            Advanced? Set your own refund address
          </span>
          <span className="text-[13px] text-[var(--brand-muted,#99a0ae)] group-hover:text-[var(--brand-fg,#0e121b)] transition-colors">
            {advancedOpen ? "Hide" : "Show"}
          </span>
        </button>
        {advancedOpen ? (
          <div id="deposit-address-advanced" className="flex flex-col gap-1.5">
            <input
              type="text"
              value={refundAddress}
              onChange={(event) => {
                setRefundAddress(event.target.value);
                setRefundError(null);
              }}
              spellCheck={false}
              autoComplete="off"
              aria-label="Refund address on the network you send from"
              placeholder="Your address on the network you send from"
              className={cn(
                "w-full h-11 px-3",
                "bg-[var(--brand-surface,#ffffff)]",
                "border border-[var(--brand-border,#e5e7eb)]",
                "rounded-[var(--brand-radius,12px)]",
                "text-sm text-[var(--brand-fg,#0e121b)]",
                "placeholder:text-[var(--brand-muted,#99a0ae)]",
                "outline-none focus:border-[var(--brand-accent,#0050ff)]",
                "transition-colors",
              )}
            />
            <p
              className={cn(
                "text-[11px]",
                refundError
                  ? "text-[var(--brand-danger,#dc2626)]"
                  : "text-[var(--brand-muted,#99a0ae)]",
              )}
            >
              {refundError ??
                "Where funds go if the route fails. Defaults to the demo's configured address."}
            </p>
          </div>
        ) : null}
      </div>
      <p className="text-[11px] text-[var(--brand-muted,#99a0ae)]">
        A unique deposit address is generated for this payment. Send from any
        wallet or exchange - it expires after 48 hours.
      </p>
    </div>
  );
}
