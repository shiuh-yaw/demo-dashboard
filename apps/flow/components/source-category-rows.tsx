"use client";

/**
 * First picker screen when source categories are enabled: three
 * funding-source rows. The deposit-address row renders only when
 * its handler is provided (destination env configured).
 */

import type { ReactNode } from "react";
import { cn } from "@dynamic-demos/utils";

interface SourceCategoryRowsProps {
  onWallet: () => void;
  onExchange: () => void;
  onDepositAddress?: () => void;
}

const ROW_CLASS = cn(
  "w-full h-[52px] flex items-center gap-3",
  "bg-[var(--brand-row-bg,#f6f8fa)] rounded-[var(--brand-radius,12px)]",
  "px-3 py-2",
  "transition-all duration-150",
  "hover:bg-[var(--brand-row-hover,#eef0f3)] active:opacity-80",
  "cursor-pointer",
);

function CategoryRow({
  icon,
  label,
  sublabel,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={ROW_CLASS}>
      <span className="w-8 h-8 shrink-0 rounded-full bg-[var(--brand-accent,#0050ff)]/10 flex items-center justify-center text-[var(--brand-accent,#0050ff)]">
        {icon}
      </span>
      <span className="flex flex-col items-start min-w-0 flex-1">
        <span className="text-sm font-medium text-[var(--brand-fg,#0e121b)] truncate">
          {label}
        </span>
        <span className="text-[11px] text-[var(--brand-muted,#99a0ae)] truncate">
          {sublabel}
        </span>
      </span>
      <svg
        className="w-4 h-4 shrink-0 text-[var(--brand-muted,#99a0ae)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

export function SourceCategoryRows({
  onWallet,
  onExchange,
  onDepositAddress,
}: SourceCategoryRowsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* walletPickerOverride replaces the picker's default header along
          with its rows, so this screen supplies its own title. */}
      <h3 className="text-base font-semibold text-[var(--brand-fg,#0e121b)] tracking-[-0.01em]">
        Pick how you&apos;ll pay
      </h3>
      <div className="flex flex-col gap-1.5">
        <CategoryRow
          onClick={onWallet}
          label="Wallet"
          sublabel="MetaMask, Phantom, Coinbase & more"
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
              />
            </svg>
          }
        />
        <CategoryRow
          onClick={onExchange}
          label="Exchange"
          sublabel="Pay from your exchange balance"
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          }
        />
        {onDepositAddress && (
          <CategoryRow
            onClick={onDepositAddress}
            label="Deposit address"
            sublabel="Send from anywhere - no connection needed"
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 6.75h.008v.008H6.75V6.75zM6.75 16.5h.008v.008H6.75V16.5zM16.5 6.75h.008v.008H16.5V6.75zM13.5 13.5h.008v.008H13.5V13.5zM13.5 19.5h.008v.008H13.5v-.008zM19.5 13.5h.008v.008H19.5V13.5zM19.5 19.5h.008v.008H19.5v-.008zM16.5 16.5h.008v.008H16.5V16.5z"
                />
              </svg>
            }
          />
        )}
      </div>
    </div>
  );
}
