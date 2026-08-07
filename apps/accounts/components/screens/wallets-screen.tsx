"use client";

/**
 * The account's wallets.
 *
 * A list, not a control panel: a wallet opens straight into its transactions,
 * which is where every action on it lives. Signers used to be nested here,
 * which made a row carry three competing actions and left no obvious way in -
 * "go into a wallet" had no target.
 *
 * Wallets are minted for the account here. Bringing an EXISTING personal
 * wallet under an account is out of scope for this demo - the wrapper still
 * exists in `lib/dynamic/business-accounts.ts`, but it is deliberately absent
 * from both this widget and the code panel.
 */

import { useMemo, useState } from "react";
import { Plus, Settings } from "lucide-react";
import {
  Button,
  IconButton,
  SegmentedTabs,
  Spinner,
  WidgetCard,
} from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/error-message";
import { EmptyState, Mono, Pill, Row } from "@/components/ui/atoms";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { useBusinessAccount } from "@/hooks/use-business-accounts";
import { ChainBadge } from "@/components/ui/chain-badge";
import { useAccountWalletAccounts } from "@/hooks/use-wallet-accounts";
import {
  accountName,
  shorten,
  signersOf,
  walletsOf,
} from "@/lib/business-accounts/view";
import { findSignableWallet } from "@/lib/dynamic";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function WalletsScreen({
  businessAccountId,
  navigation,
}: {
  businessAccountId: string;
  navigation: NavigationReturn;
}) {
  usePanelSectionEffect("wallets");

  const { detail, isLoading, error } = useBusinessAccount(businessAccountId);
  // Which of these this session can actually sign with. A wallet on the roster
  // with no match is one the user administers but holds no share for.
  const { walletAccounts } = useAccountWalletAccounts(businessAccountId);

  const allWallets = walletsOf(detail);
  const [chainFilter, setChainFilter] = useState("all");

  // Built from the wallets actually present, so the tab bar never offers a
  // chain with nothing behind it.
  const chainTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of allWallets) {
      if (!w.chain) continue;
      counts.set(w.chain, (counts.get(w.chain) ?? 0) + 1);
    }
    if (counts.size <= 1) return [];
    return [
      { value: "all", label: "All", count: allWallets.length },
      ...Array.from(counts, ([chain, count]) => ({
        value: chain,
        label: chain,
        count,
      })),
    ];
  }, [allWallets]);

  const wallets =
    chainFilter === "all"
      ? allWallets
      : allWallets.filter((w) => w.chain === chainFilter);

  return (
    <WidgetCard
      // The account's name, because this is now the first screen inside an
      // account - the hub it used to sit under is behind the gear.
      title={detail ? accountName(detail) : "Wallets"}
      subtitle="Multiple people signing on the same wallet"
      onBack={navigation.goToAccounts}
      trailing={
        <IconButton
          label="Account settings"
          onClick={() => navigation.goToAccount(businessAccountId)}
        >
          <Settings className="h-4 w-4" strokeWidth={1.5} />
        </IconButton>
      }
    >
      <div className="flex flex-col gap-3">
        {/* No "Wallets" section label: the card is already titled Wallets and
            the All tab already carries the count, so it said the same thing a
            third time. */}
        {chainTabs.length > 0 && (
          <SegmentedTabs
            value={chainFilter}
            options={chainTabs}
            onChange={setChainFilter}
            aria-label="Filter wallets by chain"
          />
        )}

        {isLoading && (
          <div className="flex min-h-32 items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}

        <ErrorMessage error={error} />

        {!isLoading && allWallets.length === 0 && (
          <EmptyState>
            No wallets yet. Mint one the account owns outright to add co-signers
            to.
          </EmptyState>
        )}

        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {wallets.map((wallet) => {
            const signers = signersOf(detail, wallet.id);
            const signable = findSignableWallet(walletAccounts, wallet);
            return (
              <Row
                key={wallet.id}
                onClick={() =>
                  navigation.goToWalletTransactions(businessAccountId, wallet)
                }
              >
                <ChainBadge chain={wallet.chain} />

                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Mono
                    title={wallet.publicKey ?? wallet.id}
                    className="min-w-0 text-(--brand-fg)"
                  >
                    {shorten(wallet.publicKey ?? wallet.id)}
                  </Mono>
                  <span className="text-[11px] text-(--brand-muted)">
                    {signers.length === 0
                      ? "No signers yet"
                      : `${signers.length} signer${signers.length === 1 ? "" : "s"}`}
                  </span>
                </span>

                {/* Only where it is true, and phrased as reach rather than a
                    lack: a member who cannot sign still administers this. */}
                {signable && <Pill tone="you">signer</Pill>}

              </Row>
            );
          })}
        </div>

        <div className="mt-1 border-t border-(--brand-border) pt-3">
          <Button
            className="w-full"
            onClick={() => navigation.goToAddWallet(businessAccountId)}
          >
            <Plus className="h-4 w-4" />
            Add wallet
          </Button>
        </div>
      </div>
    </WidgetCard>
  );
}
