"use client";

import { cn } from "@dynamic-demos/utils";
import { ArrowRightIcon } from "@/components/icons";

interface TokenInfo {
  name: string;
  symbol: string;
  amount: string;
  usdValue: string;
  iconUrl?: string;
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
        {token.iconUrl ? (
          <img
            src={token.iconUrl}
            alt={token.name}
            className="w-7 h-7 rounded-full object-contain"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-linear-to-br from-purple-400 to-blue-500" />
        )}
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

export type { TokenInfo };
