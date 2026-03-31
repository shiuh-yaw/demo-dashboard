"use client";

/**
 * WalletSelectionScreen — Choose wallet type before main app.
 *
 * Three options: external, embedded, fireblocks.
 * Selection is stored via metadata API; wallet creation is app-specific.
 *
 * @see docs/superpowers/specs/2025-03-20-unified-app-bootstrap-design.md §5
 */

import { Wallet } from "lucide-react";
import { WidgetCard } from "./widget-card";
import { DynamicLogo } from "./dynamic-logo";
import { FireblocksLogomark } from "./fireblocks-logomark";
import { cn } from "@dynamic-demos/utils";

export type WalletOption = "external" | "embedded" | "fireblocks";

export interface WalletSelectionScreenProps {
  enabledOptions: WalletOption[];
  onSelect: (option: WalletOption) => void;
  theme?: "widget" | "trade";
}

type IconComponent = typeof Wallet;
type IconNode = React.ReactNode;

const OPTIONS: {
  id: WalletOption;
  icon?: IconComponent;
  iconNode?: IconNode;
  title: string;
  explainer: string;
}[] = [
  {
    id: "external",
    icon: Wallet,
    title: "External wallet",
    explainer: "Connect your existing wallet (MetaMask, Coinbase Wallet, etc.)",
  },
  {
    id: "embedded",
    iconNode: <DynamicLogo wordmark={false} className="w-5 h-5" />,
    title: "Embedded wallet",
    explainer: "Create a wallet managed by us — no seed phrase to store",
  },
  {
    id: "fireblocks",
    iconNode: <FireblocksLogomark className="w-5 h-5" />,
    title: "Fireblocks vault",
    explainer: "Institutional-grade custody with policy controls",
  },
];

export function WalletSelectionScreen({
  enabledOptions,
  onSelect,
}: WalletSelectionScreenProps) {
  return (
    <WidgetCard
      title="Choose your wallet"
      subtitle="Select how you'd like to manage your assets"
    >
      <div className="space-y-3">
        {OPTIONS.filter((opt) => enabledOptions.includes(opt.id)).map((opt) => {
          const Icon = opt.icon;
          const iconNode = opt.iconNode;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={cn(
                "w-full flex items-start gap-3 p-4 rounded-(--widget-radius)",
                "bg-(--widget-row-bg) hover:bg-(--widget-row-bg)/80",
                "border border-transparent hover:border-(--widget-border)",
                "text-left transition-colors cursor-pointer",
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-(--widget-fg)/10 flex items-center justify-center shrink-0">
                {iconNode ??
                  (Icon && (
                    <Icon
                      className="w-5 h-5 text-(--widget-fg)"
                      strokeWidth={1.5}
                    />
                  ))}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-(--widget-fg)">{opt.title}</p>
                <p className="text-xs text-(--widget-muted) mt-0.5">
                  {opt.explainer}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </WidgetCard>
  );
}
