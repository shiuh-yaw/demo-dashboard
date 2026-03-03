"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { usePrimaryWallet } from "@/hooks/use-primary-wallet";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { useNavigation, type NavigationReturn } from "@/hooks/use-navigation";
import { useAuth } from "@/hooks/use-auth";
import { parseNetworkId } from "@/lib/constants";
import {
  FullDashboard,
  type ModalType,
} from "@/components/dashboard/full-dashboard";
import { ActionModal } from "@/components/dashboard/action-modal";
import { SendScreen } from "@/components/screens/send-screen";
import { AddRecipientScreen } from "@/components/screens/add-recipient-screen";
import { ReceiveScreen } from "@/components/screens/receive-screen";
import { WithdrawScreen } from "@/components/screens/withdraw-screen";
import { DepositScreen } from "@/components/screens/deposit-screen";
import { SaveScreen } from "@/components/screens/save-screen";
import { TxHistoryScreen } from "@/components/screens/tx-history-screen";
import { ComingSoonScreen } from "@/components/screens/coming-soon-screen";
import { useRecipients } from "@/hooks/use-recipients";
import { CARD_BALANCE_QUERY_KEY } from "@/hooks/use-card-balance";
import type { TxItem } from "@/hooks/use-transaction-history";
import type { RecipientEntry } from "@/lib/recipients";

function createModalNavigation(
  base: NavigationReturn,
  closeModal: () => void,
): NavigationReturn {
  return { ...base, goToDashboard: closeModal };
}

export interface OverviewPageProps {
  /** Server-resolved wallet address. */
  walletAddress: string;
  /** Base Sepolia chain ID. */
  networkId: number;
  /** Server-fetched USDC balance for initial render. */
  initialUsdcBalance?: number;
  /** Server-fetched recent transactions for initial render. */
  initialTransactions?: TxItem[];
  /** Whether user has submitted bank details (from server user metadata). */
  hasSubmittedBankDetails?: boolean;
  /** Withdraw vault address from server metadata (avoids /api/withdraw/address fetch). */
  initialWithdrawVaultAddress?: string | null;
  /** Known recipients from server metadata (avoids loading in Send modal). */
  initialRecipients?: RecipientEntry[];
  /** Stub stablecoin debit card from server metadata. */
  initialStubCard?: { cardNumber: string; expiry?: string } | null;
  /** Card balance from total deposits (user metadata). Starts at 0. */
  initialCardBalance?: number;
  /** Save balance from total save deposits (user metadata). Starts at 0. */
  initialSaveBalance?: number;
  /** Server-resolved KYC status. Skips /api/kyc/status fetch when true. */
  initialKycApproved?: boolean;
}

export function OverviewPage({
  walletAddress: serverWalletAddress,
  networkId: serverNetworkId,
  initialUsdcBalance,
  initialTransactions,
  hasSubmittedBankDetails,
  initialWithdrawVaultAddress,
  initialRecipients = [],
  initialStubCard = null,
  initialCardBalance = 0,
  initialSaveBalance = 0,
  initialKycApproved,
}: OverviewPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isLoggedIn = useAuth();
  const navigation = useNavigation(isLoggedIn, { initialKycApproved });
  const { primaryWallet, walletAddress: clientWalletAddress } =
    usePrimaryWallet();
  const { networkData } = useActiveNetwork(
    primaryWallet?.walletAccount ?? null,
  );
  const clientNetworkId = parseNetworkId(networkData?.networkId);
  const networkId = clientNetworkId || serverNetworkId;

  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [selectedRecipient, setSelectedRecipient] =
    useState<RecipientEntry | null>(null);
  const [isWithdrawModalLocked, setIsWithdrawModalLocked] = useState(false);
  const [isSendModalLocked, setIsSendModalLocked] = useState(false);
  const [isDepositModalLocked, setIsDepositModalLocked] = useState(false);
  const [isSaveModalLocked, setIsSaveModalLocked] = useState(false);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setSelectedRecipient(null);
    setIsWithdrawModalLocked(false);
    setIsSendModalLocked(false);
    setIsDepositModalLocked(false);
    setIsSaveModalLocked(false);
    queryClient.invalidateQueries({ queryKey: ["usdcBalance"] });
    queryClient.invalidateQueries({ queryKey: ["transactionHistory"] });
    queryClient.invalidateQueries({ queryKey: CARD_BALANCE_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["recipients"] });
  }, [queryClient]);

  const modalNavigation = createModalNavigation(navigation, closeModal);
  const { recipients } = useRecipients(initialRecipients);
  const walletAddress = clientWalletAddress || serverWalletAddress;

  return (
    <>
      <FullDashboard
        onOpenModal={setActiveModal}
        onOpenAddRecipient={() => setActiveModal("add-recipient")}
        onOpenSendToRecipient={(recipient) => {
          setSelectedRecipient(recipient);
          setActiveModal("send");
        }}
        walletAddress={walletAddress}
        networkId={networkId}
        initialUsdcBalance={initialUsdcBalance}
        initialTransactions={initialTransactions}
        recipients={recipients}
        stubCard={initialStubCard}
        initialCardBalance={initialCardBalance}
        initialSaveBalance={initialSaveBalance}
        withdrawVaultAddress={initialWithdrawVaultAddress}
      />

      <ActionModal
        open={activeModal !== null}
        onClose={closeModal}
        preventOutsideClose={
          isWithdrawModalLocked ||
          isSendModalLocked ||
          isDepositModalLocked ||
          isSaveModalLocked
        }
      >
        {activeModal === "add-recipient" && (
          <AddRecipientScreen
            navigation={modalNavigation}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["recipients"] });
              router.refresh();
            }}
          />
        )}
        {activeModal === "send" && (
          <SendScreen
            walletAddress={walletAddress}
            navigation={modalNavigation}
            onLockModalChange={setIsSendModalLocked}
            onSendSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["usdcBalance"] });
              queryClient.invalidateQueries({
                queryKey: ["transactionHistory"],
              });
            }}
            initialUsdcBalance={initialUsdcBalance}
            initialRecipients={recipients}
            initialRecipient={selectedRecipient ?? undefined}
          />
        )}
        {activeModal === "receive" && (
          <ReceiveScreen
            walletAddress={walletAddress}
            navigation={modalNavigation}
          />
        )}
        {activeModal === "deposit" && (
          <DepositScreen
            walletAddress={walletAddress}
            navigation={modalNavigation}
            onLockModalChange={setIsDepositModalLocked}
            onDepositSuccess={async (amount) => {
              try {
                await fetch("/api/deposits/add", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ amount }),
                });
              } finally {
                queryClient.invalidateQueries({ queryKey: ["usdcBalance"] });
                queryClient.invalidateQueries({
                  queryKey: ["transactionHistory"],
                });
                queryClient.invalidateQueries({
                  queryKey: CARD_BALANCE_QUERY_KEY,
                });
                router.refresh();
                // Refetch tx history again after a short delay (indexer may lag)
                setTimeout(() => {
                  queryClient.invalidateQueries({
                    queryKey: ["transactionHistory"],
                  });
                }, 2500);
              }
            }}
            initialUsdcBalance={initialUsdcBalance}
          />
        )}
        {activeModal === "save" && (
          <SaveScreen
            walletAddress={walletAddress}
            navigation={modalNavigation}
            onLockModalChange={setIsSaveModalLocked}
            onSaveSuccess={async (amount) => {
              try {
                await fetch("/api/saves/add", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ amount }),
                });
              } finally {
                queryClient.invalidateQueries({ queryKey: ["usdcBalance"] });
                queryClient.invalidateQueries({
                  queryKey: ["transactionHistory"],
                });
                router.refresh();
              }
            }}
            initialUsdcBalance={initialUsdcBalance}
          />
        )}
        {activeModal === "withdraw" && (
          <WithdrawScreen
            walletAddress={walletAddress}
            navigation={modalNavigation}
            onLockModalChange={setIsWithdrawModalLocked}
            onWithdrawalSuccess={() =>
              queryClient.invalidateQueries({ queryKey: ["usdcBalance"] })
            }
            initialHasSubmittedBankDetails={hasSubmittedBankDetails}
            initialWithdrawVaultAddress={initialWithdrawVaultAddress}
            initialUsdcBalance={initialUsdcBalance}
          />
        )}
        {activeModal === "tx-history" && (
          <TxHistoryScreen
            walletAddress={walletAddress}
            networkId={networkId}
            navigation={modalNavigation}
            withdrawVaultAddress={initialWithdrawVaultAddress}
            recipients={recipients}
          />
        )}
        {activeModal === "coming-soon" && (
          <ComingSoonScreen
            feature="More Features"
            navigation={modalNavigation}
          />
        )}
      </ActionModal>
    </>
  );
}
