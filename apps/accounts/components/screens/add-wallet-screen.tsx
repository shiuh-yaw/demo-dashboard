"use client";

/**
 * Chain selector for minting a wallet the account owns.
 *
 * Same shape as wallet's Add Wallet screen: a row per chain family with its
 * networks, minted on tap. The list comes from the environment's enabled
 * networks narrowed to the chains this app registers an extension for, so every
 * row is one `createWalletForBusinessAccount` can actually resolve a provider
 * for.
 */

import { Plus, X } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import { IconButton, Spinner, WidgetCard } from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/error-message";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { useCreateAccountWallet } from "@/hooks/use-business-accounts";
import { useChainOptions } from "@/hooks/use-chain-options";
import type { WalletChain } from "@/lib/chains";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function AddWalletScreen({
  businessAccountId,
  navigation,
}: {
  businessAccountId: string;
  navigation: NavigationReturn;
}) {
  // Minting is part of the wallets story - keep that panel up, since its step
  // 01 is exactly what this screen runs.
  usePanelSectionEffect("add-wallet");

  const chainOptions = useChainOptions();
  const createWallet = useCreateAccountWallet();
  const creatingChain = createWallet.isPending
    ? createWallet.variables?.chain
    : null;

  const handleCreate = (chain: WalletChain) => {
    createWallet.mutate(
      { businessAccountId, chain },
      { onSuccess: () => navigation.goToWallets(businessAccountId) },
    );
  };

  return (
    <WidgetCard
      title="Add Wallet"
      subtitle="Select a chain to create a new wallet"
      onBack={() => navigation.goToWallets(businessAccountId)}
      trailing={
        navigation.closeToRoot && (
          <IconButton label="Close settings" onClick={navigation.closeToRoot}>
            <X className="h-4 w-4" strokeWidth={1.5} />
          </IconButton>
        )
      }
      className="overflow-visible"
    >
      <div className="space-y-1">
        {chainOptions.length === 0 ? (
          <p className="py-4 text-center text-sm text-(--brand-muted)">
            No chains available on this environment.
          </p>
        ) : (
          <div className="scrollbar-thin -mx-1 max-h-80 overflow-y-auto px-1">
            {chainOptions.map((chain) => (
              <button
                key={chain.id}
                type="button"
                onClick={() => handleCreate(chain.id)}
                disabled={createWallet.isPending}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left",
                  "rounded-(--brand-radius) hover:bg-(--brand-row-hover)",
                  "cursor-pointer transition-colors",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {chain.icon ? (
                  <img
                    src={chain.icon}
                    alt={chain.name}
                    className="h-8 w-8 rounded-lg"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-(--brand-border) bg-(--brand-row-bg)">
                    <span className="text-[10px] font-medium text-(--brand-muted)">
                      {chain.id.slice(0, 3)}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-5 tracking-[-0.14px] text-(--brand-fg)">
                    {chain.name}
                  </p>
                  <p className="text-xs leading-4 tracking-[-0.12px] text-(--brand-muted)">
                    {chain.description}
                  </p>
                </div>
                {creatingChain === chain.id ? (
                  <Spinner size="sm" />
                ) : (
                  <Plus className="h-4 w-4 text-(--brand-muted)" />
                )}
              </button>
            ))}
          </div>
        )}

        <ErrorMessage error={createWallet.error} />
      </div>
    </WidgetCard>
  );
}
