"use client";

import { Plus } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import {
  WidgetCard,
  Spinner,
  iconButtonHoverClassName,
} from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/error-message";
import { useCreateWallet } from "@/hooks/use-mutations";
import { useChainOptions } from "@/hooks/use-chain-options";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import type { Chain } from "@/lib/dynamic";
import type { NavigationReturn } from "@/hooks/use-navigation";

interface AddWalletScreenProps {
  navigation: NavigationReturn;
}

/**
 * Full-screen chain selector for creating new embedded wallets.
 *
 * Renders inside the WidgetCard (same pattern as send-tx, scan-qr screens).
 * Shows all available chain families from the Dynamic dashboard with a
 * scrollable list and a back button to return to the dashboard.
 */
export function AddWalletScreen({ navigation }: AddWalletScreenProps) {
  const chainOptions = useChainOptions();
  const { mutate: createWallet, isPending, error, variables } = useCreateWallet();
  // Q-017: Add Wallet is part of the wallet-management story — keep the
  // wallets panel up (its step 02 is exactly what this screen runs).
  usePanelSectionEffect("wallets");

  const handleCreateWallet = (chainId: Chain) => {
    createWallet(chainId, {
      onSuccess: () => navigation.goToDashboard(),
    });
  };

  const creatingChainId = isPending ? variables : null;

  return (
    <WidgetCard
      title="Add Wallet"
      subtitle="Select a chain to create a new wallet"
      onBack={navigation.goToDashboard}
    >
      <div className="space-y-1">
        {chainOptions.length === 0 ? (
          <p className="text-sm text-(--brand-muted) text-center py-4">
            No additional chains available
          </p>
        ) : (
          <div className="overflow-y-auto max-h-80 scrollbar-thin -mx-1 px-1">
            {chainOptions.map((chain) => (
              <button
                key={chain.id}
                type="button"
                onClick={() => handleCreateWallet(chain.id)}
                disabled={isPending}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left",
                  "hover:bg-(--brand-row-hover) rounded-(--brand-radius)",
                  "transition-colors cursor-pointer",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  // Only the + lifts; the chain logo is an <img>, not an svg.
                  iconButtonHoverClassName,
                )}
              >
                {chain.icon ? (
                  <img
                    src={chain.icon}
                    alt={chain.name}
                    className="w-8 h-8 rounded-lg"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-(--brand-row-bg) border border-(--brand-border) flex items-center justify-center">
                    <span className="text-[10px] font-medium text-(--brand-muted)">
                      {chain.id.slice(0, 3)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-(--brand-fg) tracking-[-0.14px] leading-5">
                    {chain.name}
                  </p>
                  <p className="text-xs text-(--brand-muted) tracking-[-0.12px] leading-4">
                    {chain.description}
                  </p>
                </div>
                {creatingChainId === chain.id ? (
                  <Spinner size="sm" />
                ) : (
                  <Plus className="w-4 h-4 text-(--brand-muted)" />
                )}
              </button>
            ))}
          </div>
        )}

        <ErrorMessage error={error} />
      </div>
    </WidgetCard>
  );
}
