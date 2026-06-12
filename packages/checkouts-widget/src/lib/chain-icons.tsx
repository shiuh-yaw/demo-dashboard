/**
 * chainId → iconic chain icon, plus a positioned `<ChainBadge>` that
 * overlays the bottom-right of a token icon.
 *
 * Added per the multichain identity rule: every token row carries its
 * chain context — "USDC on Base" and "USDC on Polygon" are different
 * assets (different bridges, fees, recipient compatibility), so chain
 * mark surfaces on every row, not just collisions.
 */

import type { ComponentType } from "react";
import {
  ArbitrumIcon,
  BaseChainIcon,
  BnbIcon,
  EthereumIcon,
  OptimismIcon,
  PolygonIcon,
  SolanaIcon,
} from "@dynamic-labs/iconic";

import { DYNAMIC_SOLANA_NETWORK_ID } from "./chain";

type IconComponent = ComponentType<{ className?: string }>;

/**
 * Chain id → iconic component. Add new chains here as supported
 * networks expand; unmapped ids return `null` and the badge is omitted.
 */
const CHAIN_ICONS: Record<number, IconComponent> = {
  // Mainnets
  1: EthereumIcon,
  8453: BaseChainIcon,
  137: PolygonIcon,
  42161: ArbitrumIcon,
  10: OptimismIcon,
  56: BnbIcon,
  [DYNAMIC_SOLANA_NETWORK_ID]: SolanaIcon,
  // Testnets — same icon as the parent chain
  11155111: EthereumIcon, // Ethereum Sepolia
  84532: BaseChainIcon, // Base Sepolia
  421614: ArbitrumIcon, // Arbitrum Sepolia
  11155420: OptimismIcon, // OP Sepolia
};

export function getChainIcon(chainId: number): IconComponent | null {
  return CHAIN_ICONS[chainId] ?? null;
}

/**
 * Small chain mark anchored to the bottom-right of a relative parent.
 *
 * The badge sits on a 3px ring of the widget's surface color
 * (`--widget-bg`, white in light mode) so it reads as "lifted" off the
 * colored token icon underneath — the row background (`--widget-row-hover`,
 * light gray) would be the wrong choice because most token marks are
 * colored circles and the badge needs to visibly punch out from them.
 *
 * Plus a 0.5px outer hairline + soft shadow for depth so the chip
 * reads as a tangible micro-mark, not a flat sticker.
 *
 * The parent must be `position: relative` and sized to the token icon
 * (32px in the asset selector). `size` is the inner icon's pixel size;
 * the outer ringed chip is `size + 4` (2px ring × 2). Default 11→15
 * lands at ~47% of a 32px parent, which reads as confident without
 * stealing focus from the token mark.
 */
export function ChainBadge({
  chainId,
  size = 11,
}: {
  chainId: number;
  size?: number;
}) {
  const Icon = getChainIcon(chainId);
  if (!Icon) return null;
  const ringedSize = size + 4;
  return (
    <span
      aria-hidden
      className="absolute -bottom-[2px] -right-[2px] inline-flex items-center justify-center rounded-full bg-[var(--widget-bg,#ffffff)] shadow-[0_0_0_0.5px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.12)]"
      style={{ width: ringedSize, height: ringedSize }}
    >
      <span
        className="block overflow-hidden rounded-full"
        style={{ width: size, height: size }}
      >
        <Icon className="block h-full w-full rounded-full" />
      </span>
    </span>
  );
}
