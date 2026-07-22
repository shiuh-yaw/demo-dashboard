"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, QrCode, ArrowDownToLine, PiggyBank } from "lucide-react";
import { Spinner } from "@dynamic-demos/ui";
import { usePrimaryWallet } from "@/hooks/use-primary-wallet";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { parseNetworkId } from "@/lib/constants";
import { useCardBalance } from "@/hooks/use-card-balance";
import { useRemoveRecipient } from "@/hooks/use-recipients";
import { BalanceCard } from "./balance-card";
import { SaveBalanceCard } from "./save-balance-card";
import { RecentTransactions } from "./recent-transactions";
import { RecentRecipients } from "./recent-recipients";
import { StableCoinDebitCard } from "./stable-coin-debit-card";
import type { TxItem } from "@/hooks/use-transaction-history";
import type { RecipientEntry } from "@/lib/recipients";

export type ModalType =
  | "send"
  | "receive"
  | "withdraw"
  | "deposit"
  | "save"
  | "tx-history"
  | "coming-soon"
  | "add-recipient";

interface FullDashboardProps {
  onOpenModal: (modal: ModalType) => void;
  /** When true, show Add funds button on the stablecoin card (requires stubCard). */
  showCardDepositButton?: boolean;
  /** Open add-recipient form (creates contact, does not show send flow). */
  onOpenAddRecipient?: () => void;
  /** Open send modal with recipient pre-selected. */
  onOpenSendToRecipient?: (recipient: RecipientEntry) => void;
  /** Server-resolved wallet address. Used when client wallet hasn't hydrated. */
  walletAddress: string;
  /** Network/chain ID for transaction history. */
  networkId: number;
  /** Server-fetched USDC balance for initial render. */
  initialUsdcBalance?: number;
  /** Server-fetched recent transactions for initial render. */
  initialTransactions?: TxItem[];
  /** Known recipients from server metadata. */
  recipients?: RecipientEntry[];
  /** Stub stablecoin debit card from server metadata. */
  stubCard?: { cardNumber: string; expiry?: string } | null;
  /** Card balance derived from total deposits (user metadata). Starts at 0. Used as initial data. */
  initialCardBalance?: number;
  /** Save balance from total save deposits (user metadata). Starts at 0. */
  initialSaveBalance?: number;
  /** Withdraw vault address for display as "Withdraw" in transaction history. */
  withdrawVaultAddress?: string | null;
}

export function FullDashboard({
  onOpenModal,
  showCardDepositButton = true,
  onOpenAddRecipient,
  onOpenSendToRecipient,
  walletAddress: serverWalletAddress,
  networkId: serverNetworkId,
  initialUsdcBalance,
  initialTransactions,
  recipients = [],
  stubCard = null,
  initialCardBalance = 0,
  initialSaveBalance = 0,
  withdrawVaultAddress,
}: FullDashboardProps) {
  const router = useRouter();
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const removeRecipient = useRemoveRecipient();

  const handleCreateCard = async () => {
    setIsCreatingCard(true);
    try {
      const res = await fetch("/api/cards/create", { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsCreatingCard(false);
    }
  };
  const {
    primaryWallet,
    walletAddress: clientWalletAddress,
    isLoading,
  } = usePrimaryWallet();
  const { networkData } = useActiveNetwork(
    primaryWallet?.walletAccount ?? null,
  );
  const clientNetworkId = parseNetworkId(networkData?.networkId);
  const networkId = clientNetworkId || serverNetworkId;
  const walletAddress = clientWalletAddress || serverWalletAddress;

  const { balance: cardBalance, isFetching: cardBalanceLoading } =
    useCardBalance({
      initialBalance: initialCardBalance,
    });

  const { balance, isLoading: balanceLoading } = useUsdcBalance(
    walletAddress || undefined,
    { initialBalance: initialUsdcBalance },
  );

  const showLoading = isLoading && !serverWalletAddress;

  if (showLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Welcome header - full width, above the two-column layout */}
      <div>
        <h1 className="text-2xl font-bold text-(--brand-fg)">Welcome back</h1>
        <p className="text-sm text-(--brand-muted) mt-1">
          Manage your funds and send money globally
        </p>
      </div>

      {/* Two columns: balance+actions+tx (left) | recipients+cards (right) - right aligns with balance card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <BalanceCard
            walletBalance={balance}
            saveBalance={initialSaveBalance}
            cardBalance={cardBalance}
            balanceLoading={balanceLoading}
            cardBalanceLoading={cardBalanceLoading}
            walletAddress={walletAddress}
          />

          <div className="grid grid-cols-4 gap-3">
            <ActionTile
              icon={<Send className="w-5 h-5" />}
              label="Send Money"
              onClick={() => onOpenModal("send")}
            />
            <ActionTile
              icon={<ArrowDownToLine className="w-5 h-5" />}
              label="Withdraw"
              onClick={() => onOpenModal("withdraw")}
            />
            <ActionTile
              icon={<PiggyBank className="w-5 h-5" />}
              label="Save"
              onClick={() => onOpenModal("save")}
            />
            <ActionTile
              icon={<QrCode className="w-5 h-5" />}
              label="Receive"
              onClick={() => onOpenModal("receive")}
            />
            {/* <ActionTile
              icon={<ArrowUpFromLine className="w-5 h-5" />}
              label="Deposit"
              onClick={() => onOpenModal("deposit")}
            /> */}
          </div>

          <RecentTransactions
            walletAddress={walletAddress}
            networkId={networkId}
            initialTransactions={initialTransactions}
            withdrawVaultAddress={withdrawVaultAddress}
            recipients={recipients}
          />
        </div>

        {/* Right column: recipients, bank cards - aligns with balance card */}
        <div className="space-y-4">
          <RecentRecipients
            recipients={recipients}
            onAddRecipient={
              onOpenAddRecipient ?? (() => onOpenModal("add-recipient"))
            }
            onSendToRecipient={
              onOpenSendToRecipient ?? (() => onOpenModal("send"))
            }
            onRemoveRecipient={(recipient) =>
              removeRecipient.mutate(recipient.email)
            }
          />
          <StableCoinDebitCard
            stubCard={stubCard}
            balance={cardBalance}
            balanceLoading={cardBalanceLoading}
            isCreating={isCreatingCard}
            onCreateCard={handleCreateCard}
            showAddFundsButton={showCardDepositButton && !!stubCard}
            onAddFunds={() => onOpenModal("deposit")}
          />
          <SaveBalanceCard
            balance={initialSaveBalance}
            onClick={() => onOpenModal("save")}
          />
        </div>
      </div>
    </div>
  );
}

function ActionTile({
  icon,
  label,
  onClick,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
        muted
          ? "bg-(--brand-row-bg) border-(--brand-border) text-(--brand-muted) hover:bg-(--brand-row-hover)"
          : "bg-white border-(--brand-border) text-(--brand-fg) hover:border-(--brand-primary)/30 hover:bg-(--brand-primary)/5"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          muted
            ? "bg-(--brand-row-hover) text-(--brand-muted)"
            : "bg-(--brand-primary)/10 text-(--brand-primary)"
        }`}
      >
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
