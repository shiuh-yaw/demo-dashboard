"use client";

import { AlertTriangle, ChevronDown } from "lucide-react";
import { useDepositNetwork } from "@/contexts/deposit-network-context";
import {
  DEPOSIT_NETWORK_OPTIONS,
  type DepositNetwork,
} from "@/lib/deposit-network";

export function NetworkBar() {
  const { network, walletNetworkMismatch, setNetworkAndSync } =
    useDepositNetwork();

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative">
        <select
          value={network}
          onChange={(e) =>
            void setNetworkAndSync(e.target.value as DepositNetwork)
          }
          className={`appearance-none rounded-lg border bg-(--widget-bg) px-3 py-1.5 pr-8 text-xs font-medium shadow-sm outline-none transition-colors hover:bg-(--widget-row-hover) cursor-pointer ${
            walletNetworkMismatch
              ? "border-amber-400 text-amber-600"
              : "border-(--widget-border) text-(--widget-fg) focus:border-(--widget-accent)"
          }`}
          aria-label="Network"
        >
          {DEPOSIT_NETWORK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {walletNetworkMismatch ? (
          <AlertTriangle
            className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-amber-500"
            strokeWidth={2}
            aria-hidden
          />
        ) : (
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-(--widget-muted)"
            strokeWidth={2}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
