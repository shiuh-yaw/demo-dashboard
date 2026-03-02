"use client";

import { useState, useCallback } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { WithdrawToWalletModal } from "./withdraw-to-wallet-modal";
import { usePayoutDemoOptional } from "@/contexts/payout-demo-context";
import { truncateAddress } from "@dynamic-demos/utils";
import type { WalletAccount } from "@/lib/dynamic";
import { OptionCard } from "@/components/ui/option-card";

export function WithdrawToWalletOption() {
  const [modalOpen, setModalOpen] = useState(false);
  const payoutDemo = usePayoutDemoOptional();

  const handleSuccess = useCallback(
    (amount: number, wallet: WalletAccount, _txHash: string) => {
      // Record activity for the withdrawal
      payoutDemo?.recordWithdrawActivity(amount, wallet.address);
      toast.success(
        `Sent ${amount.toFixed(2)} USDC to ${truncateAddress(wallet.address)}`
      );
    },
    [payoutDemo]
  );

  return (
    <>
      <OptionCard
        icon={<Wallet className="w-5 h-5 text-earn-text-secondary" />}
        title="Withdraw to wallet"
        description="On-chain transfer to crypto wallet"
        onClick={() => setModalOpen(true)}
      />
      <WithdrawToWalletModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
