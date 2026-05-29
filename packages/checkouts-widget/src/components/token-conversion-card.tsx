"use client";

import { useState } from "react";
import {
  BitcoinIcon,
  BnbIcon,
  EthereumIcon,
  SolanaIcon,
  SuiIcon,
  type Iconic,
} from "@dynamic-labs/iconic";
import { cn } from "@dynamic-demos/utils";
import { ArrowRightIcon } from "./icons";
import { ChainBadge } from "../lib/chain-icons";

/**
 * Map of well-known native-token symbols to Dynamic's `Iconic` chain icons.
 * Iconic ships chain-level icons only, so non-native tokens (USDC, USDT, …)
 * fall through to the URL-based fallback chain below.
 */
const ICONIC_TOKEN_ICONS: Record<string, Iconic> = {
  ETH: EthereumIcon,
  WETH: EthereumIcon,
  BTC: BitcoinIcon,
  WBTC: BitcoinIcon,
  SOL: SolanaIcon,
  SUI: SuiIcon,
  BNB: BnbIcon,
};

interface TokenInfo {
  name: string;
  symbol: string;
  amount: string;
  usdValue: string;
  iconUrl?: string;
  /**
   * Chain id used to render the chain micro-badge in the bottom-right
   * of the token icon (same treatment as `AssetSelectorScreen` rows).
   * Optional for backward-compat — when omitted the badge is skipped.
   */
  chainId?: number;
}

interface TokenConversionCardProps {
  sourceToken: TokenInfo;
  destinationToken?: TokenInfo;
  className?: string;
}

/**
 * Displays source token and optional destination token with conversion arrow.
 * Used in both ReviewPaymentScreen and TransactionProgressScreen.
 */
export default function TokenConversionCard({
  sourceToken,
  destinationToken,
  className,
}: TokenConversionCardProps) {
  const showConversion =
    destinationToken && destinationToken.symbol !== sourceToken.symbol;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Source Token */}
      <TokenDisplay
        token={sourceToken}
        gradientDirection={showConversion ? "to-r" : "to-b"}
      />

      {/* Arrow + Destination Token */}
      {showConversion && destinationToken && (
        <>
          <div className="w-4 h-4 flex items-center justify-center shrink-0 text-(--brand-muted)">
            <ArrowRightIcon />
          </div>
          <TokenDisplay token={destinationToken} gradientDirection="to-l" />
        </>
      )}
    </div>
  );
}

/**
 * Individual token display card
 */
function TokenDisplay({
  token,
  gradientDirection,
}: {
  token: TokenInfo;
  gradientDirection: "to-r" | "to-l" | "to-b";
}) {
  const gradientClass = {
    "to-r": "bg-gradient-to-r",
    "to-l": "bg-gradient-to-l",
    "to-b": "bg-gradient-to-b",
  }[gradientDirection];

  return (
    <div
      className={cn(
        "flex-1 p-3 rounded-(--brand-radius)",
        gradientClass,
        "from-(--brand-card-gradient-start) to-(--brand-card-gradient-end)",
      )}
    >
      <div className="flex flex-col items-center gap-1.5">
        <TokenIcon
          iconUrl={token.iconUrl}
          name={token.name}
          symbol={token.symbol}
          chainId={token.chainId}
        />
        <div className="flex flex-col items-center text-center">
          <span className="text-xs text-(--brand-muted) tracking-[-0.12px]">
            {token.name}
          </span>
          <span className="text-sm font-medium text-(--brand-fg) tracking-[-0.14px]">
            {token.amount} {token.symbol}
          </span>
          <span className="text-xs text-(--brand-muted) tracking-[-0.12px]">
            {token.usdValue}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Iconify's open-source `cryptocurrency` icon set, keyed by lowercase symbol.
 * Deterministic URL — works for common tokens (eth, btc, usdc, usdt, bnb, …)
 * and tends to bypass adblockers that block raw.githubusercontent.com.
 */
function iconifyCryptoUrl(symbol: string): string {
  return `https://api.iconify.design/cryptocurrency/${symbol.toLowerCase()}.svg`;
}

/**
 * Token icon with progressive fallback:
 *   @dynamic-labs/iconic match  →  primary iconUrl  →  iconify cryptocurrency
 *   set  →  gradient + symbol initials
 *
 * URL attempts shift forward via onError. The gradient + initials always
 * renders something legible if every source is blocked.
 */
function TokenIcon({
  iconUrl,
  name,
  symbol,
  chainId,
}: {
  iconUrl?: string;
  name: string;
  symbol: string;
  chainId?: number;
}) {
  const IconicIcon = ICONIC_TOKEN_ICONS[symbol.toUpperCase()];

  const sources = [iconUrl, iconifyCryptoUrl(symbol)].filter(
    (url): url is string => Boolean(url),
  );
  const [attempt, setAttempt] = useState(0);
  const currentSrc = sources[attempt];

  const inner = IconicIcon ? (
    <IconicIcon className="w-7 h-7 rounded-full" title={name} aria-label={name} />
  ) : !currentSrc ? (
    <div
      className="w-7 h-7 rounded-full bg-linear-to-br from-purple-400 to-blue-500 flex items-center justify-center text-[10px] font-medium text-white"
      aria-label={name}
      title={name}
    >
      {symbol.slice(0, 3).toUpperCase()}
    </div>
  ) : (
    <img
      key={currentSrc}
      src={currentSrc}
      alt={name}
      className="w-7 h-7 rounded-full object-contain"
      onError={() => setAttempt((n) => n + 1)}
    />
  );

  // Wrap in a relative 28x28 container so <ChainBadge> can anchor to
  // bottom-right with the same treatment as the asset-selector rows.
  return (
    <span className="relative inline-flex h-7 w-7">
      {inner}
      {typeof chainId === "number" && <ChainBadge chainId={chainId} />}
    </span>
  );
}

export type { TokenInfo };
