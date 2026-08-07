"use client";

/**
 * A wallet's home screen: its transactions, and the toolbar that acts on it.
 *
 * Deliberately the FIRST thing tapping a wallet opens, matching the wallet
 * demo - there is no intermediate detail screen. History is what a wallet is
 * for looking at, and everything else is one icon away: copy the address,
 * send, refresh, and manage who can sign.
 *
 * `getTransactionHistory` is chain-agnostic, so nothing here branches per
 * chain. Paged by cursor, because the API returns a `nextOffset` and nothing
 * else - "load more" is the only navigation that shape supports.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  History,
  PenLine,
  RefreshCw,
  Send,
  Users,
} from "lucide-react";
import {
  Button,
  CopyButton,
  IconButton,
  NetworkSelect,
  ScrollableWithFade,
  Spinner,
  TransactionRow,
  WidgetCard,
  type TransactionDirection,
} from "@dynamic-demos/ui";
import { cn, truncateAddress } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { useBusinessAccount } from "@/hooks/use-business-accounts";
import { useNetworkOptions } from "@/hooks/use-networks";
import {
  useAccountWalletAccounts,
  useActiveNetwork,
} from "@/hooks/use-wallet-accounts";
import {
  HISTORY_PAGE_SIZE,
  useSwitchNetwork,
  useTransactionHistory,
} from "@/hooks/use-wallet-actions";
import { accountName } from "@/lib/business-accounts/view";
import { findSignableWallet } from "@/lib/dynamic";
import type { BusinessAccountWalletSummary } from "@/lib/dynamic";
import type { NavigationReturn } from "@/hooks/use-navigation";

/** The API reports direction in a `labels` array; map it once, here. */
function directionOf(labels: unknown[] | undefined): TransactionDirection {
  const list = (labels ?? []) as string[];
  if (list.includes("sent")) return "sent";
  if (list.includes("receive")) return "received";
  return "unknown";
}

export function WalletTransactionsScreen({
  businessAccountId,
  wallet,
  navigation,
}: {
  businessAccountId: string;
  wallet: BusinessAccountWalletSummary;
  navigation: NavigationReturn;
}) {
  usePanelSectionEffect("transactions");

  const [offset, setOffset] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();

  const { detail } = useBusinessAccount(businessAccountId);
  const { walletAccounts } = useAccountWalletAccounts(businessAccountId);
  const signable = findSignableWallet(walletAccounts, wallet);
  const { networkData } = useActiveNetwork(signable);
  const networkOptions = useNetworkOptions(signable?.chain ?? wallet.chain);
  const switchNetwork = useSwitchNetwork();

  const address = signable?.address ?? wallet.publicKey ?? "";
  const chain = signable?.chain ?? wallet.chain ?? undefined;
  const networkId =
    networkData?.networkId == null ? undefined : Number(networkData.networkId);

  const { data, isLoading, isFetching, error } = useTransactionHistory({
    address,
    chain,
    networkId,
    offset,
  });

  const transactions = data?.transactions ?? [];
  const nextOffset = data?.nextOffset || undefined;

  const refresh = () => {
    setOffset(undefined);
    queryClient.invalidateQueries({ queryKey: ["tx-history"] });
  };

  return (
    <WidgetCard
      // The account's name, not "Transactions": whose wallet this is is the
      // fact this demo has and a personal wallet does not, and the address
      // below already says which wallet. The list underneath is self-evidently
      // transactions.
      title={detail ? accountName(detail) : "Wallet"}
      subtitle={truncateAddress(address)}
      onBack={() => navigation.goToWallets(businessAccountId)}
      // Signers are the one thing here that is not about moving value, so they
      // sit in the header rather than competing with the toolbar below.
      trailing={
        <IconButton
          label="Signers"
          onClick={() =>
            navigation.goToWalletSigners(businessAccountId, wallet)
          }
        >
          <Users className="h-4 w-4" strokeWidth={1.5} />
        </IconButton>
      }
      className="overflow-visible"
    >
      <div className="flex flex-col gap-2">
        <div className="relative z-10 flex items-center justify-between gap-2 overflow-visible">
          <NetworkSelect
            value={String(networkData?.networkId ?? "")}
            options={networkOptions}
            onChange={(id) => {
              if (!signable) return;
              setOffset(undefined);
              void switchNetwork
                .mutateAsync({ walletAccount: signable, networkId: id })
                .catch(() => {
                  // Rendered below from the mutation's error.
                });
            }}
            disabled={!signable || switchNetwork.isPending}
          />

          <div className="flex items-center gap-0.5">
            <CopyButton
              text={address}
              label="Copy address"
              showTooltip
              className="rounded-full"
            />
            {/* Sending needs a share of the key; the rest of this toolbar does
                not, so only this one disappears for a non-signer. */}
            {signable && (
              <>
                <IconButton
                  label="Sign message"
                  onClick={() =>
                    navigation.goToSignMessage(businessAccountId, wallet)
                  }
                >
                  <PenLine className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  label="Send"
                  onClick={() => navigation.goToSend(businessAccountId, wallet)}
                >
                  <Send className="h-3.5 w-3.5" />
                </IconButton>
              </>
            )}
            <IconButton label="Refresh" onClick={refresh} disabled={isFetching}>
              <RefreshCw
                className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
              />
            </IconButton>
          </div>
        </div>

        <ErrorMessage error={switchNetwork.error} />

        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Spinner size="lg" />
          </div>
        )}

        <ErrorMessage error={error} />

        {!isLoading && !error && transactions.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 py-6">
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-(--brand-row-bg)">
              <History
                className="h-5 w-5 text-(--brand-muted)"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-sm font-medium text-(--brand-fg)">
              No transactions yet
            </p>
            <p className="max-w-[220px] text-center text-xs text-(--brand-muted)">
              Transactions will appear here once this wallet has activity.
            </p>
          </div>
        )}

        {!isLoading && transactions.length > 0 && (
          <ScrollableWithFade contentClassName="space-y-1.5">
            {transactions.map((tx) => {
              const direction = directionOf(tx.labels);
              const transfer = tx.assetTransfers?.[0];
              return (
                <TransactionRow
                  key={tx.transactionHash}
                  direction={direction}
                  // The API returns `amount` already decimal-adjusted - do not
                  // divide by 10^decimals (verified on Base Sepolia: 10 USDC
                  // arrives as amount 10 with decimals 6, contradicting the
                  // docs' "smallest unit"; reported).
                  amount={transfer?.amount ?? undefined}
                  symbol={transfer?.metadata?.symbol ?? chain ?? undefined}
                  counterparty={
                    direction === "sent" ? tx.toAddress : tx.fromAddress
                  }
                  hash={tx.transactionHash}
                  timestamp={new Date(tx.transactionTimestamp)}
                  explorerUrl={tx.blockExplorerUrls?.[0]}
                />
              );
            })}
          </ScrollableWithFade>
        )}

        {nextOffset && !isLoading && transactions.length >= HISTORY_PAGE_SIZE && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setOffset(nextOffset)}
            loading={isFetching && !isLoading}
          >
            <ChevronDown className="h-4 w-4" />
            Load More
          </Button>
        )}
      </div>
    </WidgetCard>
  );
}
