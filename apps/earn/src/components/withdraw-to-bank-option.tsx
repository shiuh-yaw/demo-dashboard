"use client";

import { useState, useCallback } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { WithdrawToBankModal } from "./withdraw-to-bank-modal";
import { OptionCard } from "@/components/ui/option-card";

export function WithdrawToBankOption() {
  const [modalOpen, setModalOpen] = useState(false);

  const handleSuccess = useCallback((amount: number, _payoutId: string) => {
    // Activity is recorded by the modal itself
    toast.success(`Withdrawal of ${amount.toFixed(2)} PYUSD initiated via PIX`);
  }, []);

  return (
    <>
      <OptionCard
        icon={<Building2 className="w-5 h-5 text-earn-text-secondary" />}
        title="Withdraw to bank"
        description="PIX transfer to linked bank"
        onClick={() => setModalOpen(true)}
      />
      <WithdrawToBankModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
