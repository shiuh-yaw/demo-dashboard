"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dynamic-demos/ui";
import { Label } from "@/components/ui/label";
import { Button } from "@dynamic-demos/ui";
import { Input } from "@dynamic-demos/ui";
import { cn, formatCurrency } from "@dynamic-demos/utils";
import { useSendToDead } from "@/hooks/use-send-to-dead";
import { useCreatorBalanceOptional } from "@/contexts/creator-balance-context";
import { Loader2 } from "lucide-react";
import { ModalErrorBoundary } from "@/components/ui/error-boundary";
import { showErrorToast, showSuccessToast } from "@/lib/error-handling";

const PRESET_AMOUNTS = [50, 100, 250, 500];

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Max amount user can add (from their balance). */
  maxAmount: string;
  onSuccess: (amount: number) => void;
}

export function AddFundsModal({
  isOpen,
  onClose,
  maxAmount,
  onSuccess,
}: AddFundsModalProps) {
  const max = useMemo(() => Math.max(0, parseFloat(maxAmount) || 0), [maxAmount]);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const creatorBalance = useCreatorBalanceOptional();

  const { isPending, sendToDead } = useSendToDead({
    onSuccess: () => {
      const amount = Number(effectiveAmount.toFixed(2));
      // Trigger a balance refresh from blockchain after successful transfer
      creatorBalance?.triggerRefresh();
      showSuccessToast(`Added ${formatCurrency(amount)} to your card`);
      onSuccess(amount);
      setSelectedAmount(null);
      setCustomAmount("");
      onClose();
    },
    onError: (error) => {
      showErrorToast(error);
    },
  });

  const effectiveAmount = selectedAmount ?? (parseFloat(customAmount) || 0);
  const isValid = effectiveAmount > 0 && effectiveAmount <= max;
  const presetOptions = useMemo(
    () => PRESET_AMOUNTS.filter((a) => a <= max),
    [max]
  );

  const handleConfirm = async () => {
    if (!isValid || isPending) return;
    const amount = Number(effectiveAmount.toFixed(2));
    try {
      await sendToDead({ amountDollars: amount });
    } catch {
      // Error is shown via toast from hook
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isPending) {
      setSelectedAmount(null);
      setCustomAmount("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-5">
        <ModalErrorBoundary>
          <DialogHeader className="space-y-2">
            <DialogTitle>Add funds</DialogTitle>
            <DialogDescription className="text-earn-text-secondary">
              Choose an amount from your balance to add to your prepaid card.
            </DialogDescription>
            <p className="text-sm text-earn-text-secondary mt-1">
              Available: {formatCurrency(maxAmount)}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {presetOptions.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-earn-text-primary mb-2 block">
                  Amount
                </Label>
                <div className="flex flex-wrap gap-2">
                  {presetOptions.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount("");
                      }}
                      disabled={isPending}
                      className={cn(
                        "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                        selectedAmount === amount && customAmount === ""
                          ? "border-earn-text-primary bg-earn-text-primary/10 text-earn-text-primary"
                          : "border-earn-border/60 hover:bg-gray-50 text-earn-text-primary",
                        isPending && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label
                htmlFor="add-funds-custom"
                className="text-sm font-medium text-earn-text-primary mb-2 block"
              >
                Or enter amount
              </Label>
              <Input
                id="add-funds-custom"
                type="number"
                min={0}
                max={max}
                step={0.01}
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                disabled={isPending}
                className="tabular-nums"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirm}
              disabled={!isValid || isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                "Add funds"
              )}
            </Button>
          </DialogFooter>
        </ModalErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
