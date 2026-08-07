"use client";

/**
 * A wallet's chain, as the environment's own icon.
 *
 * Reads faster than a text pill and matches the icon picked on Add Wallet. The
 * chain name stays in `alt`/`title`, so the badge is never icon-only to a
 * reader, and an unknown chain falls back to the pill rather than to nothing.
 */

import { cn } from "@dynamic-demos/utils";
import { Pill } from "@/components/ui/atoms";
import { useChainOptions } from "@/hooks/use-chain-options";

export function ChainBadge({
  chain,
  className,
}: {
  chain: string | null | undefined;
  className?: string;
}) {
  const icon = useChainOptions().find((option) => option.id === chain)?.icon;

  if (!chain) return null;
  if (!icon) return <Pill tone="brand">{chain}</Pill>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon}
      alt={chain}
      title={chain}
      className={cn("h-6 w-6 shrink-0 rounded-md", className)}
    />
  );
}
