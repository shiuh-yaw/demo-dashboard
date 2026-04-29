"use client";

// CheckoutShell orchestrates the Dynamic SDK checkout flow across six views:
//   1. createTx      — auto-fires createCheckoutTransaction
//   2. pickWallet    — list wallet providers and connect
//   3. pickToken     — show wallet balances, user picks source token
//   4. reviewQuote   — attach source, fetch quote, show total
//   5. submit        — sign + broadcast via submitCheckoutTransaction
//   6. status        — poll getCheckoutTransaction until terminal
//
// Account propagation is via `useClientState(getWalletAccounts)` here — each
// view reads from the same shared client state.

import {
  cancelCheckoutTransaction,
  getWalletAccounts,
  logout,
} from "@dynamic-labs-sdk/client";
import type {
  CheckoutTransaction,
  WalletAccount,
} from "@dynamic-labs-sdk/client";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Panel, Spinner } from "./primitives.js";
import type { SelectedTokenInfo, View } from "./types.js";
import { useClientState } from "./useClientState.js";
import { useSelectedAccount } from "./useSelectedAccount.js";
import { useWalletProviderSync } from "./useWalletProviderSync.js";
import { CreateTransactionView } from "./views/CreateTransactionView.js";
import { PickTokenView } from "./views/PickTokenView.js";
import { PickWalletView } from "./views/PickWalletView.js";
import { ReviewQuoteView } from "./views/ReviewQuoteView.js";
import { StatusView } from "./views/StatusView.js";
import { SubmitView } from "./views/SubmitView.js";

type CheckoutShellProps = {
  checkoutId: string;
  amountUsd: string;
  onTransactionSubmitted: (dynamicTransactionId: string) => Promise<void>;
  onTransactionCompleted: (args: {
    dynamicTransactionId: string;
    txHash: string;
    sourceChain?: string;
    sourceAsset?: string;
    sourceAssetLogo?: string;
  }) => Promise<void>;
};

export function CheckoutShell({
  checkoutId,
  amountUsd,
  onTransactionSubmitted,
  onTransactionCompleted,
}: CheckoutShellProps) {
  const [view, setView] = useState<View>("createTx");
  const [transaction, setTransaction] = useState<CheckoutTransaction | null>(
    null,
  );
  const [fromToken, setFromToken] = useState<SelectedTokenInfo | null>(null);

  const accounts = useClientState<WalletAccount[]>(
    "walletAccountsChanged",
    (c) => getWalletAccounts(c),
  );
  // selectedAccount is derived from the live accounts array on every render —
  // when an injected provider switches accounts, Dynamic re-emits the event
  // with a new address on the same id, and the derived object surfaces it
  // automatically (no stale useState snapshot to sync).
  const { selectedAccount, selectAccountId } = useSelectedAccount(accounts);

  // Dynamic's client-level `walletAccountsChanged` doesn't fire when an
  // injected provider (MetaMask) switches its active address between
  // already-connected accounts. This hook bridges the provider-level
  // `accountsChanged` back into Dynamic's walletAccounts + our selection.
  useWalletProviderSync(accounts, selectAccountId);

  // Tracks the last-seen connected-wallet address so we can detect disconnects
  // and account switches mid-flow. `undefined` = haven't observed any yet
  // (i.e. initial mount); `null` = observed "no wallet connected".
  const previousAddressRef = useRef<string | null | undefined>(undefined);

  // React to wallet-account changes that happen after the user has already
  // progressed past pickWallet. We stay out of this while the shell is on
  // createTx or pickWallet: those views manage their own wallet state.
  useEffect(() => {
    const currentAddress = selectedAccount?.address ?? null;
    const previousAddress = previousAddressRef.current;

    if (previousAddress === undefined) {
      // First observation — record and do nothing. Prevents firing on mount.
      previousAddressRef.current = currentAddress;
      return;
    }

    if (previousAddress === currentAddress) {
      return;
    }

    // pickWallet/createTx own their own wallet-state reactivity.
    if (view === "createTx" || view === "pickWallet") {
      previousAddressRef.current = currentAddress;
      return;
    }

    if (currentAddress === null) {
      // Wallet disconnected mid-flow — send the user back to reconnect.
      setTransaction(null);
      setFromToken(null);
      setView("pickWallet");
    } else {
      // Account switched to a different non-null wallet — keep the
      // transaction (it's tied to checkoutId, not the source wallet) but drop
      // the token selection since balances belong to the previous account.
      setFromToken(null);
      setView("pickToken");
    }

    previousAddressRef.current = currentAddress;
  }, [selectedAccount?.address, view]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (transaction) {
        await cancelCheckoutTransaction({ transactionId: transaction.id });
      }
    },
    onSettled: () => {
      setTransaction(null);
      setFromToken(null);
      selectAccountId(null);
      setView("createTx");
    },
  });

  // "Change" on PickTokenView triggers this. We terminate all connected wallet
  // providers (the SDK's `logout` function fans out to each provider's
  // terminate/disconnect hooks under the hood) so MetaMask-style extensions
  // present a fresh permission prompt on the next connect — letting the user
  // pick any account, including ones they haven't previously authorized.
  //
  // We deliberately KEEP `transaction`: the Dynamic CheckoutTransaction is
  // keyed on checkoutId, not on the source wallet, and source attachment
  // doesn't happen until ReviewQuoteView. Clearing it here would leave the
  // pickToken view (after the user re-picks a wallet) without a transaction
  // and fall through to the Spinner-loading catch-all.
  const disconnectMutation = useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      setFromToken(null);
      selectAccountId(null);
      setView("pickWallet");
    },
  });

  const handleTxCreated = (tx: CheckoutTransaction) => {
    setTransaction(tx);
    setView(selectedAccount ? "pickToken" : "pickWallet");
  };

  if (view === "createTx") {
    return (
      <CreateTransactionView
        checkoutId={checkoutId}
        amountUsd={amountUsd}
        onCreated={handleTxCreated}
      />
    );
  }

  if (view === "pickWallet") {
    return <PickWalletView onConnected={() => setView("pickToken")} />;
  }

  if (view === "pickToken" && transaction && selectedAccount) {
    return (
      <PickTokenView
        walletAccount={selectedAccount}
        accounts={accounts}
        onSelectAccount={(account) => {
          // Changing accounts mid-flow invalidates the previously-picked token
          // (balances belong to the old account). Drop it and stay on
          // pickToken so the new account's balances load.
          setFromToken(null);
          selectAccountId(account.id);
        }}
        minMarketValue={Number(amountUsd)}
        onSelect={(token) => {
          setFromToken(token);
          setView("reviewQuote");
        }}
        onDisconnect={() => disconnectMutation.mutate()}
      />
    );
  }

  if (view === "reviewQuote" && transaction && selectedAccount && fromToken) {
    return (
      <ReviewQuoteView
        transactionId={transaction.id}
        walletAccount={selectedAccount}
        fromToken={fromToken}
        onBack={() => {
          setFromToken(null);
          setView("pickToken");
        }}
        onConfirm={() => setView("submit")}
      />
    );
  }

  if (view === "submit" && transaction && selectedAccount) {
    return (
      <SubmitView
        transactionId={transaction.id}
        walletAccount={selectedAccount}
        onSubmitted={async () => {
          setView("status");
          try {
            await onTransactionSubmitted(transaction.id);
          } catch {
            // Parent handles banner; shell still advances to status.
          }
        }}
        onCancel={() => cancelMutation.mutate()}
      />
    );
  }

  if (view === "status" && transaction && selectedAccount) {
    return (
      <StatusView
        transactionId={transaction.id}
        onCompleted={async (tx) => {
          await onTransactionCompleted({
            dynamicTransactionId: tx.id,
            txHash: tx.txHash ?? "",
            sourceChain: tx.fromChainName,
            sourceAsset: fromToken?.symbol ?? tx.fromToken,
            sourceAssetLogo: fromToken?.logoURI,
          });
        }}
        onFailed={() => {
          // Let the status panel stay on screen; parent re-renders with new
          // state on next refresh.
        }}
      />
    );
  }

  return (
    <Panel>
      <Spinner label="Loading…" />
    </Panel>
  );
}
