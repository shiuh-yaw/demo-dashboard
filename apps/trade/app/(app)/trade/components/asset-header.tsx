"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Globe, Share2 } from "lucide-react";
import { useTokenStats } from "@/hooks/use-token-stats";

const ASSET_NAMES: Record<string, string> = {
  ETH: "Ethereum",
  BTC: "Bitcoin",
  SOL: "Solana",
  MATIC: "Polygon",
  ARB: "Arbitrum",
};

interface AssetHeaderProps {
  symbol: string;
  name?: string | null;
  logo?: string | null;
  price?: string | null;
  change24h?: number | null;
}

export function AssetHeader({
  symbol,
  name: metadataName,
  logo,
  price,
  change24h,
}: AssetHeaderProps) {
  const name = metadataName ?? ASSET_NAMES[symbol] ?? symbol;
  const { data: stats } = useTokenStats(symbol);
  const links = stats?.links;

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      await navigator.share({
        title: `${name} (${symbol})`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="flex flex-col gap-2 pb-4 border-b border-trade-border/30">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-trade-text-muted">
        <Link
          href="/trade"
          className="hover:text-trade-text-secondary transition-colors"
        >
          Tokens
        </Link>
        <ChevronRight size={14} className="text-trade-text-muted/70 shrink-0" />
        <span className="text-trade-text-secondary">{symbol}</span>
      </nav>

      {/* Token identity + action icons (compact) */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-trade-surface border border-trade-border/50">
            {logo ? (
              <Image
                src={logo}
                alt={name}
                width={48}
                height={48}
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full animate-pulse rounded-full bg-trade-border/50" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-trade-text-primary">{name}</h1>
            <p className="text-xs text-trade-text-secondary">{symbol}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {links?.homepage && (
            <a
              href={links.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-trade-text-muted hover:text-trade-text-primary hover:bg-trade-surface transition-colors"
              aria-label="Website"
            >
              <Globe size={18} />
            </a>
          )}
          {links?.twitter && (
            <a
              href={links.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-trade-text-muted hover:text-trade-text-primary hover:bg-trade-surface transition-colors"
              aria-label="X (Twitter)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          )}
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-lg text-trade-text-muted hover:text-trade-text-primary hover:bg-trade-surface transition-colors"
            aria-label="Share"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
      {/* Compact price line */}
      {(price != null || change24h != null) && (
        <p className="text-sm text-trade-text-secondary tabular-nums">
          {price != null && <span className="font-medium text-trade-text-primary">{price}</span>}
          {change24h != null && (
            <span
              className={`ml-1.5 ${change24h >= 0 ? "text-trade-success" : "text-trade-error"}`}
            >
              {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
            </span>
          )}
        </p>
      )}
    </div>
  );
}
