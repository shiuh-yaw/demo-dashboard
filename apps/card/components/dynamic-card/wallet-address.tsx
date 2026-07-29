"use client";

/**
 * Truncated embedded-wallet address with copy + block-explorer affordances.
 * Shared by the "Available to fund" row and the transaction-history header.
 */

import { ExternalLink } from "lucide-react";
import { CopyButton, Tooltip } from "@dynamic-demos/ui";

import { explorerAddressUrl } from "@/lib/explorer";

export function WalletAddress({ address }: { address: string }) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-xs text-(--brand-muted) tabular-nums tracking-[-0.12px] leading-4">
        {`${address.slice(0, 6)}…${address.slice(-4)}`}
      </span>
      <CopyButton
        text={address}
        label="Copy wallet address"
        showTooltip
        size="sm"
        className="text-(--brand-muted) hover:text-(--brand-fg)"
      />
      <Tooltip content="View on explorer">
        <a
          href={explorerAddressUrl(address)}
          target="_blank"
          rel="noreferrer"
          className="p-0.5 rounded text-(--brand-muted) hover:text-(--brand-fg) transition-colors cursor-pointer"
          aria-label="View wallet on block explorer"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </Tooltip>
    </div>
  );
}
