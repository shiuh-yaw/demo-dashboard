"use client";

// Picker for choosing which connected wallet account drives the checkout when
// the user has more than one active (e.g. MetaMask with multiple authorized
// addresses, or an EVM + Solana combo). Mirrors the NetworkSelector shape: a
// native <select> styled with the SPARK26 Navy surface + SVG chevron.
//
// Deliberately returns null when only one account is connected — the static
// "Paying from …" row in PickTokenView already communicates that case, and a
// dropdown with a single option is just noise.
//
// The explicit React import is needed because vitest's JSX transform uses the
// classic runtime when compiling this file for the test environment; Next.js
// handles the automatic runtime at production build time.
import React from "react";
import type { WalletAccount } from "@dynamic-labs-sdk/client";

export type AccountSelectorProps = {
  accounts: WalletAccount[];
  selected: WalletAccount;
  onSelect: (account: WalletAccount) => void;
};

export function AccountSelector({
  accounts,
  selected,
  onSelect,
}: AccountSelectorProps) {
  if (accounts.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      <select
        aria-label="Account"
        value={selected.id}
        onChange={(e) => {
          const next = accounts.find((a) => a.id === e.target.value);
          if (next) onSelect(next);
        }}
        className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-[var(--color-navy)] px-4 py-2.5 pr-10 text-sm text-white hover:border-white/30 focus:border-[var(--color-blue)] focus:outline-none"
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {formatAccountLabel(account)}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/50"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

/** Exposed for testing — builds the display label for an account option. */
export function formatAccountLabel(account: WalletAccount): string {
  const short = `${account.address.slice(0, 6)}…${account.address.slice(-4)}`;
  return `${short} (${account.chain})`;
}
