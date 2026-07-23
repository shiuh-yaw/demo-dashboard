"use client";

/**
 * Chain + asset picker for the deposit-address source. One step:
 * each option is a (chain, asset) pair because the quote's fromAmount
 * is denominated in the asset the user must send.
 */

import { cn } from "@dynamic-demos/utils";
import type { DepositAddressSourceOption } from "@/lib/deposit-address";
import { DrillInHeader } from "./drill-in-header";

interface DepositAddressAssetListProps {
  options: readonly DepositAddressSourceOption[];
  onSelected: (option: DepositAddressSourceOption) => void;
  onChangeSource: () => void;
}

export function DepositAddressAssetList({
  options,
  onSelected,
  onChangeSource,
}: DepositAddressAssetListProps) {
  return (
    <div className="flex flex-col gap-4">
      <DrillInHeader title="What will you send?" onBack={onChangeSource} />
      <div className="flex flex-col gap-1.5">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onSelected(option)}
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
      <p className="text-[11px] text-[var(--brand-muted,#99a0ae)]">
        A unique deposit address is generated for this payment. Send from
        any wallet or exchange - it expires after 48 hours.
      </p>
    </div>
  );
}
