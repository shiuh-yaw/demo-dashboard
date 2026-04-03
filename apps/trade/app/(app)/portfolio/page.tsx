"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SendModal } from "@/components/send/send-modal";
import { useMarketCoins } from "@/hooks/use-market-coins";
import { useMockMode } from "@/contexts/mock-mode-context";
import { useMockMetadata } from "@/hooks/use-mock-metadata";
import { useMockBalances } from "@/hooks/use-mock-balances";
import { MOCK_METADATA_KEYS } from "@/lib/mock-metadata";
import type {
  MockVaultPosition,
  MockPredictPosition,
} from "@/lib/mock-metadata";

// =============================================================================
// Balance Hero
// =============================================================================

function BalanceHero({ totalUsd }: { totalUsd: number }) {
  const formatted =
    totalUsd >= 1000
      ? `$${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="relative overflow-hidden rounded-[20px] px-6 pt-8 pb-8 lg:flex-1 lg:flex lg:flex-col lg:justify-center text-center lg:text-left bg-gradient-to-b from-[var(--trade-balance-gradient-start)] to-[var(--trade-balance-gradient-end)] dark:bg-[#1A1A1E]">
      {/* Light mode decorative blurs */}
      <div className="pointer-events-none absolute -right-8 -top-4 h-48 w-48 rounded-full bg-trade-accent/[0.07] blur-3xl dark:hidden" />
      <div className="pointer-events-none absolute -right-4 bottom-0 h-32 w-32 rounded-full bg-trade-accent/[0.05] blur-2xl dark:hidden" />
      {/* Dark mode decorative circles (from Figma) */}
      <div className="pointer-events-none absolute left-4 bottom-4 h-[98px] w-[98px] rounded-full bg-[#32D8C5]/[0.08] blur-2xl hidden dark:block" />
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-[163px] w-[163px] rounded-full bg-[#9FBAFF]/[0.10] blur-2xl hidden dark:block" />

      <p className="text-sm font-medium text-trade-text-secondary dark:text-[#8E8E93] tracking-wide">
        Total Balance
      </p>
      <h1 className="mt-2 text-[2.5rem] lg:text-5xl leading-tight font-bold text-trade-text-primary tabular-nums tracking-tight">
        {formatted}
      </h1>
      <p className="mt-1 text-sm font-medium text-trade-success">+ 76.18%</p>
    </div>
  );
}

// =============================================================================
// Action Icons (from Figma)
// =============================================================================

function IconDeposit({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 0C9.55229 0 10 0.447715 10 1V8H17C17.5523 8 18 8.44772 18 9C18 9.55229 17.5523 10 17 10H10V17C10 17.5523 9.55229 18 9 18C8.44772 18 8 17.5523 8 17V10H1C0.447715 10 0 9.55228 0 9C0 8.44772 0.447715 8 1 8H8V1C8 0.447715 8.44772 0 9 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconSend({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="16"
      viewBox="0 0 18 16"
      fill="none"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.3147 0.325838C2.32426 0.330025 2.33383 0.334211 2.34339 0.338396L16.7453 6.64069C16.9415 6.7265 17.1382 6.81257 17.2917 6.89658C17.4343 6.9746 17.7096 7.13635 17.8664 7.44483C18.0445 7.79516 18.0445 8.20622 17.8664 8.55655C17.7096 8.86503 17.4343 9.02678 17.2917 9.1048C17.1382 9.18881 16.9415 9.27488 16.7453 9.36068L2.31962 15.6734C2.11828 15.7616 1.91772 15.8494 1.74861 15.9064C1.5936 15.9586 1.28089 16.0543 0.93489 15.9604C0.544156 15.8543 0.227505 15.5757 0.0800713 15.2082C-0.0504875 14.8828 0.0162818 14.5706 0.0542734 14.4154C0.0957243 14.2461 0.16559 14.0433 0.235727 13.8397L2.23509 8.03185L0.239461 2.18493C0.236158 2.17526 0.232852 2.16558 0.229547 2.1559C0.160176 1.95276 0.0910153 1.75024 0.0501041 1.58115C0.0125446 1.42591 -0.0531301 1.11435 0.0777872 0.789745C0.225733 0.422919 0.542355 0.145031 0.932717 0.0394056C1.27815 -0.054063 1.59015 0.0413108 1.74511 0.0935104C1.9139 0.150368 2.114 0.237971 2.3147 0.325838ZM1.99487 2.01962L3.75091 7.16458H7.87026C8.34512 7.16458 8.73006 7.53892 8.73006 8.00069C8.73006 8.46246 8.34512 8.8368 7.87026 8.8368H3.77137L2.00113 13.9791L15.6627 8.00069L1.99487 2.01962Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconConvert({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="18"
      viewBox="0 0 20 18"
      fill="none"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.29289 0.292893C4.68342 -0.0976311 5.31658 -0.0976311 5.70711 0.292893L9.70711 4.29289C10.0976 4.68342 10.0976 5.31658 9.70711 5.70711C9.31658 6.09763 8.68342 6.09763 8.29289 5.70711L6 3.41421V13C6 13.5523 5.55228 14 5 14C4.44772 14 4 13.5523 4 13V3.41421L1.70711 5.70711C1.31658 6.09763 0.683418 6.09763 0.292893 5.70711C-0.0976311 5.31658 -0.0976311 4.68342 0.292893 4.29289L4.29289 0.292893ZM14 14.5858V5C14 4.44772 14.4477 4 15 4C15.5523 4 16 4.44772 16 5V14.5858L18.2929 12.2929C18.6834 11.9024 19.3166 11.9024 19.7071 12.2929C20.0976 12.6834 20.0976 13.3166 19.7071 13.7071L15.7071 17.7071C15.3166 18.0976 14.6834 18.0976 14.2929 17.7071L10.2929 13.7071C9.90237 13.3166 9.90237 12.6834 10.2929 12.2929C10.6834 11.9024 11.3166 11.9024 11.7071 12.2929L14 14.5858Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconEarn({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="12"
      viewBox="0 0 20 12"
      fill="none"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11 2C10.4477 2 10 1.55228 10 1C10 0.447715 10.4477 0 11 0H19C19.5523 0 20 0.447715 20 1V9C20 9.55229 19.5523 10 19 10C18.4477 10 18 9.55229 18 9V3.41421L11.7071 9.70711C11.3166 10.0976 10.6834 10.0976 10.2929 9.70711L7 6.41421L1.70711 11.7071C1.31658 12.0976 0.683418 12.0976 0.292893 11.7071C-0.0976311 11.3166 -0.0976311 10.6834 0.292893 10.2929L6.29289 4.29289C6.68342 3.90237 7.31658 3.90237 7.70711 4.29289L11 7.58579L16.5858 2H11Z"
        fill="currentColor"
      />
    </svg>
  );
}

// =============================================================================
// Action Buttons
// =============================================================================

const ACTIONS: {
  icon: React.FC<{ className?: string }>;
  label: string;
  href?: string;
}[] = [
  { icon: IconDeposit, label: "Deposit" },
  { icon: IconSend, label: "Send" },
  { icon: IconConvert, label: "Convert", href: "/trade" },
  { icon: IconEarn, label: "Earn", href: "/earn" },
];

function ActionButtons({
  onAction,
}: {
  onAction?: (label: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 lg:gap-3">
      {ACTIONS.map((action) => {
        const content = (
          <>
            <action.icon className="text-trade-text-primary transition-transform group-hover:scale-110" />
            <span className="text-sm font-medium text-trade-text-primary transition-transform group-hover:scale-105">
              {action.label}
            </span>
          </>
        );
        const className =
          "group flex flex-col items-center justify-center gap-2.5 rounded-xl bg-trade-surface-blue py-4 lg:py-5 cursor-pointer transition-all active:scale-[0.97]";
        return action.href ? (
          <Link
            key={action.label}
            href={action.href}
            className={className}
          >
            {content}
          </Link>
        ) : (
          <button
            key={action.label}
            className={className}
            onClick={() => onAction?.(action.label)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Feature Cards
// =============================================================================

interface FeatureCardProps {
  title: string;
  subtitle: string;
  gradient: string;
  titleColor: string;
  subtitleColor: string;
  imageSrc: string;
  imageAlt: string;
  imageClassName: string;
  imageObjectFit?: "cover" | "contain";
  href?: string;
}

function FeatureCard({
  title,
  subtitle,
  gradient,
  titleColor,
  subtitleColor,
  imageSrc,
  imageAlt,
  imageClassName,
  imageObjectFit = "cover",
  href,
}: FeatureCardProps) {
  const content = (
    <>
      <div className="relative z-10 max-w-[45%]">
        <h3 className={`text-lg font-semibold tracking-tight ${titleColor}`}>
          {title}
        </h3>
        <p className={`mt-0.5 text-sm leading-snug ${subtitleColor}`}>
          {subtitle}
        </p>
      </div>
      <div className="relative z-10 mt-auto pt-2 transition-transform group-hover:translate-x-1">
        <ChevronRight size={18} strokeWidth={3} className={subtitleColor} />
      </div>
      <Image
        src={imageSrc}
        alt={imageAlt}
        width={160}
        height={150}
        style={{ objectFit: imageObjectFit }}
        className={`pointer-events-none absolute transition-transform duration-300 group-hover:scale-110 ${imageClassName}`}
      />
    </>
  );

  const className = `group relative flex min-h-[120px] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-b p-3.5 transition-colors active:scale-[0.98] ${gradient}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function FeatureCardsGrid() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <FeatureCard
          title="Trading"
          subtitle="Swap tokens across chains"
          gradient="from-[#8beea9] to-[#ccfcda]"
          titleColor="text-[#2b7837]"
          subtitleColor="text-[#499655]/60"
          imageSrc="/images/features/perps-chart.png"
          imageAlt="Trading chart"
          imageClassName="right-[-10px] bottom-[-10px] h-[150px] w-[160px]"
          href="/trade"
        />
        <FeatureCard
          title="Predictions"
          subtitle="Bet on real world events"
          gradient="from-[#ebd080] to-[#feead8]"
          titleColor="text-[#78772b]"
          subtitleColor="text-[#969549]/60"
          imageSrc="/images/features/predictions-badges.png"
          imageAlt="Yes and No prediction badges"
          imageClassName="right-[-10px] bottom-[-10px] h-[150px] w-[160px]"
          imageObjectFit="contain"
          href="/predictions"
        />
      </div>
      <VirtualCardsBanner />
    </div>
  );
}

// =============================================================================
// Virtual Cards Banner
// =============================================================================

function VirtualCardsBanner() {
  return (
    <div className="group relative min-h-[140px] cursor-pointer overflow-hidden rounded-xl bg-[#eaf5ff] p-3.5 transition-colors active:scale-[0.99]">
      <div className="relative z-10 max-w-[45%]">
        <h3 className="text-lg font-semibold tracking-tight text-[#273662]">
          Virtual Cards
        </h3>
        <p className="mt-0.5 text-sm leading-snug text-[#495b96]/60">
          Spend your crypto instantly online
        </p>

        {/* CTA */}
        <div className="mt-8 flex items-center gap-1 text-sm font-medium text-[#273662] transition-transform group-hover:translate-x-1">
          <span>Open Now</span>
          <ChevronRight size={18} strokeWidth={3} />
        </div>
      </div>

      <Image
        src="/images/features/virtual-cards.png"
        alt="Virtual credit cards"
        width={261}
        height={200}
        className="pointer-events-none absolute right-[-20px] top-[-7px] h-[160px] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  );
}

// =============================================================================
// Asset List
// =============================================================================

function formatAmount(amount: number, symbol: string): string {
  const sym = symbol.toUpperCase();
  if (amount >= 1000)
    return `${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${sym}`;
  if (amount >= 1)
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${sym}`;
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })} ${sym}`;
}

function formatUsd(value: number): string {
  if (value >= 1000)
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface PortfolioAsset {
  id: string;
  symbol: string;
  name: string;
  image: string;
  amount: string;
  value: string;
  usdValue: number;
}

function formatApy(value: number | null | undefined): string {
  if (value == null) return "--";
  return `${(value * 100).toFixed(2)}%`;
}

function AssetList({
  onTotalChange,
}: {
  onTotalChange?: (total: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<"assets" | "positions">("assets");
  const { data: coins, isLoading } = useMarketCoins({ perPage: 12 });
  const { isMockMode } = useMockMode();
  const { getBalance } = useMockBalances();
  const { metadata } = useMockMetadata();
  const earnDeposits = (metadata[MOCK_METADATA_KEYS.EARN] as
    | { deposits?: MockVaultPosition[] }
    | undefined)?.deposits ?? [];
  const predictPositions = (metadata[MOCK_METADATA_KEYS.PREDICT] as
    | { positions?: MockPredictPosition[] }
    | undefined)?.positions ?? [];
  const hasPositions = earnDeposits.length > 0 || predictPositions.length > 0;

  const assets = useMemo((): PortfolioAsset[] => {
    if (!coins?.length || !isMockMode) return [];
    return coins
      .filter((c) => c.current_price != null && c.current_price > 0)
      .map((coin) => {
        const amount = getBalance(coin.symbol);
        const price = coin.current_price ?? 0;
        const usdValue = amount * price;
        return {
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          image: coin.image,
          amount: formatAmount(amount, coin.symbol),
          value: formatUsd(usdValue),
          usdValue,
        };
      })
      .filter((a) => a.usdValue > 0);
  }, [coins, isMockMode, getBalance]);

  const totalUsd = useMemo(
    () => assets.reduce((s, a) => s + a.usdValue, 0),
    [assets],
  );
  useEffect(() => {
    onTotalChange?.(totalUsd);
  }, [totalUsd, onTotalChange]);

  return (
    <div className="rounded-2xl bg-trade-surface dark:bg-transparent p-4 lg:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none">
      {/* Tabs */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => setActiveTab("assets")}
          className={`text-base font-medium cursor-pointer transition-colors ${
            activeTab === "assets"
              ? "text-trade-text-primary"
              : "text-trade-text-primary/30 hover:text-trade-text-primary/50"
          }`}
        >
          Assets
        </button>
        <button
          onClick={() => setActiveTab("positions")}
          className={`text-base font-medium cursor-pointer transition-colors ${
            activeTab === "positions"
              ? "text-trade-text-primary"
              : "text-trade-text-primary/30 hover:text-trade-text-primary/50"
          }`}
        >
          Positions
        </button>
      </div>

      {/* Asset rows */}
      <div>
        {activeTab === "assets" ? (
          isLoading ? (
            <div className="py-12 text-center text-trade-text-muted text-sm">
              Loading assets…
            </div>
          ) : assets.length === 0 ? (
            <div className="py-12 text-center text-trade-text-muted text-sm">
              No assets
            </div>
          ) : (
            assets.map((asset, i) => (
              <Link
                key={asset.id}
                href={`/trade?symbol=${encodeURIComponent(asset.symbol)}`}
                className={`group flex items-center justify-between px-2 py-3.5 cursor-pointer rounded-lg transition-colors hover:bg-trade-bg ${
                  i < assets.length - 1 ? "border-b border-trade-border/40" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-trade-bg flex items-center justify-center">
                    <Image
                      src={asset.image}
                      alt={asset.name}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  </div>
                  <p className="text-[15px] font-semibold text-trade-text-primary">
                    {asset.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-semibold text-trade-text-primary tabular-nums uppercase">
                    {asset.amount}
                  </p>
                  <p className="text-[13px] font-medium text-trade-text-secondary tabular-nums">
                    {asset.value}
                  </p>
                </div>
              </Link>
            ))
          )
        ) : isMockMode && hasPositions ? (
            <>
              {earnDeposits.map((pos, i) => (
                <Link
                  key={pos.id}
                  href="/earn"
                  className={`group flex items-center justify-between px-2 py-3.5 cursor-pointer rounded-lg transition-colors hover:bg-trade-surface-elevated ${
                    i < earnDeposits.length - 1 || predictPositions.length > 0
                      ? "border-b border-trade-border/40"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-trade-bg flex items-center justify-center">
                      {pos.assetLogoURI ? (
                        <Image
                          src={pos.assetLogoURI}
                          alt={pos.assetName}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-trade-text-muted">
                          {pos.assetSymbol.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-semibold text-trade-text-primary">
                          {pos.vaultName}
                        </p>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-trade-accent/20 text-trade-accent border border-trade-accent/30">
                          Earn
                        </span>
                      </div>
                      <p className="text-[13px] font-medium text-trade-text-secondary">
                        {pos.amount} {pos.assetSymbol} · {formatApy(pos.apy)} APY
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-trade-text-muted group-hover:text-trade-text-primary transition-colors"
                  />
                </Link>
              ))}
              {predictPositions.map((pos, i) => (
                <Link
                  key={pos.id}
                  href={`/predictions/${encodeURIComponent(pos.eventSlug)}`}
                  className={`group flex items-center justify-between px-2 py-3.5 cursor-pointer rounded-lg transition-colors hover:bg-trade-surface-elevated ${
                    i < predictPositions.length - 1
                      ? "border-b border-trade-border/40"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-trade-bg flex items-center justify-center">
                      {pos.imageUrl ? (
                        <Image
                          src={pos.imageUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-sm font-medium text-trade-text-muted">
                          ?
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-semibold text-trade-text-primary line-clamp-1">
                          {pos.marketQuestion}
                        </p>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                          Predict
                        </span>
                      </div>
                      <p className="text-[13px] font-medium text-trade-text-secondary">
                        {pos.side === "yes" ? "Yes" : "No"} · ${pos.amount}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-trade-text-muted group-hover:text-trade-text-primary transition-colors"
                  />
                </Link>
              ))}
            </>
          ) : (
            <div className="py-12 text-center text-trade-text-muted text-sm">
              No open positions
            </div>
          )}
      </div>
    </div>
  );
}

// =============================================================================
// Portfolio Page
// =============================================================================

export default function PortfolioPage() {
  const [totalUsd, setTotalUsd] = useState(0);
  const [sendModalOpen, setSendModalOpen] = useState(false);

  const handleAction = (label: string) => {
    if (label === "Send") setSendModalOpen(true);
  };

  return (
    <>
      {/* Top zone: Balance+Actions | Feature Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Left: Balance + Actions */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <BalanceHero totalUsd={totalUsd} />
          <ActionButtons onAction={handleAction} />
        </div>

        {/* Right: Feature cards + Virtual Cards */}
        <div className="lg:col-span-2">
          <FeatureCardsGrid />
        </div>
      </div>

      {/* Bottom zone: Asset list (full width) */}
      <div className="mt-4 lg:mt-6">
        <AssetList onTotalChange={setTotalUsd} />
      </div>

      <SendModal open={sendModalOpen} onOpenChange={setSendModalOpen} />
    </>
  );
}
