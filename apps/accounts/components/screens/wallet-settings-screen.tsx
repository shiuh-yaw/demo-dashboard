"use client";

/**
 * Managing a wallet, as opposed to using it.
 *
 * The cog in the wallet's header opens this rather than jumping straight to
 * signers: administration is a set of pages now, not one, and a toolbar full of
 * icons cannot say which is which.
 */

import { KeyRound, ShieldCheck, X } from "lucide-react";
import { IconButton, Skeleton, WidgetCard } from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import { Row } from "@/components/ui/atoms";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { useBusinessAccount } from "@/hooks/use-business-accounts";
import { useAccountWalletAccounts } from "@/hooks/use-wallet-accounts";
import { signersOf } from "@/lib/business-accounts/view";
import { findSignableWallet } from "@/lib/dynamic";
import type { BusinessAccountWalletSummary } from "@/lib/dynamic";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function WalletSettingsScreen({
  businessAccountId,
  wallet,
  navigation,
}: {
  businessAccountId: string;
  wallet: BusinessAccountWalletSummary;
  navigation: NavigationReturn;
}) {
  usePanelSectionEffect("wallets");

  const { detail, isPlaceholder } = useBusinessAccount(businessAccountId);
  const { walletAccounts } = useAccountWalletAccounts(businessAccountId);
  const signable = findSignableWallet(walletAccounts, wallet);
  const address = signable?.address ?? wallet.publicKey ?? wallet.id;
  const signers = signersOf(detail, wallet.id);

  return (
    <WidgetCard
      title="Wallet settings"
      subtitle={truncateAddress(address)}
      onBack={() => navigation.goToWalletTransactions(businessAccountId, wallet)}
      trailing={
        navigation.closeToRoot && (
          <IconButton label="Close settings" onClick={navigation.closeToRoot}>
            <X className="h-4 w-4" strokeWidth={1.5} />
          </IconButton>
        )
      }
      className="overflow-visible"
    >
      <div className="flex flex-col gap-3">
        <Row
          onClick={() => navigation.goToWalletSigners(businessAccountId, wallet)}
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-surface,#fff)">
            <KeyRound className="h-4 w-4 text-(--brand-fg)" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-medium text-(--brand-fg)">
              Signers
            </span>
            {isPlaceholder ? (
              <Skeleton className="mt-0.5 h-3 w-20 rounded" />
            ) : (
              <span className="text-[11px] text-(--brand-muted)">
                {signers.length} can sign for this wallet
              </span>
            )}
          </span>
        </Row>

        <Row
          onClick={() =>
            navigation.goToWalletPolicies(businessAccountId, wallet)
          }
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-surface,#fff)">
            <ShieldCheck className="h-4 w-4 text-(--brand-fg)" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-medium text-(--brand-fg)">
              Wallet rules
            </span>
            <span className="text-[11px] text-(--brand-muted)">
              Bind every signer on this wallet
            </span>
          </span>
        </Row>

        <p className="text-[11px] leading-relaxed text-(--brand-muted)">
          A signer&apos;s own rules live on that signer - open one from Signers.
          They tighten the wallet&apos;s rules and can never loosen them.
        </p>
      </div>
    </WidgetCard>
  );
}
