"use client";

/**
 * Inline Widget Preview Component
 *
 * Renders a preview using shared UI components directly (no iframe).
 * Uses CSS variables from @dynamic-demos/theme for styling.
 */

import { Wallet, Send, Copy } from "lucide-react";
import { WidgetCard, Button } from "@dynamic-demos/ui";
import { widgetThemeToCssVars, type WidgetTheme } from "@dynamic-demos/theme";

interface InlineWidgetPreviewProps {
  theme: Partial<WidgetTheme>;
  branding?: {
    logo?: string;
    showPoweredBy?: boolean;
  };
}

// Mock wallet data for preview
const MOCK_WALLETS = [
  { address: "0x1234...5678", chain: "EVM", network: "Ethereum" },
  { address: "0xabcd...ef01", chain: "EVM", network: "Base" },
  { address: "7Xf9...kL2m", chain: "SVM", network: "Solana" },
];

export function InlineWidgetPreview({
  theme,
  branding,
}: InlineWidgetPreviewProps) {
  const cssVars = widgetThemeToCssVars(theme);

  return (
    <div className="flex-1 sticky top-8 h-fit">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium text-[#99a0ae] uppercase tracking-[0.48px]">
          Preview
        </span>
      </div>

      {/* Preview container */}
      <div
        className="rounded-xl overflow-hidden border border-[#e1e4ea] p-6 flex flex-col items-center justify-center gap-4 min-h-[500px]"
        style={{
          backgroundColor: theme.pageBackground || "#f6f8fa",
          ...cssVars,
        } as React.CSSProperties}
      >
        {/* Prospect Logo */}
        {branding?.logo && (
          <img
            src={branding.logo}
            alt="Prospect logo"
            className="h-12 object-contain"
          />
        )}

        {/* Preview Card */}
        <div className="w-full max-w-[380px]">
          <WidgetCard
            icon={
              <Wallet
                className="w-[18px] h-[18px] text-(--widget-fg)"
                strokeWidth={1.5}
              />
            }
            title="Your Wallets"
            subtitle="Manage your embedded wallets"
          >
            <div className="space-y-4">
              {/* Wallet rows */}
              <div className="space-y-2">
                {MOCK_WALLETS.map((wallet, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2.5 bg-(--widget-row-bg) rounded-(--widget-radius) transition-colors hover:bg-(--widget-row-hover)"
                  >
                    {/* Left: Network icon + Address */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 shrink-0 rounded-lg overflow-hidden bg-(--widget-bg) border border-(--widget-border) flex items-center justify-center">
                        <span className="text-[10px] font-medium text-(--widget-muted)">
                          {wallet.chain}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-(--widget-fg) tracking-[-0.14px] leading-5 truncate">
                          {wallet.address}
                        </p>
                        <p className="text-xs text-(--widget-muted) tracking-[-0.12px] leading-4">
                          {wallet.chain} · {wallet.network}
                        </p>
                      </div>
                    </div>

                    {/* Right: Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        className="p-2 rounded-full transition-colors text-(--widget-muted) hover:text-(--widget-fg) hover:bg-black/5"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-full transition-colors text-(--widget-muted) hover:text-(--widget-fg) hover:bg-black/5"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-px bg-(--widget-border)" />

              {/* Create wallet button */}
              <Button className="w-full">Create Wallet</Button>
            </div>
          </WidgetCard>
        </div>

        {/* Powered by footer */}
        {branding?.showPoweredBy !== false && (
          <div className="flex items-center gap-1.5 text-xs text-(--widget-muted)">
            Powered by
            <span className="font-medium text-(--widget-fg)">dynamic</span>
          </div>
        )}
      </div>
    </div>
  );
}
