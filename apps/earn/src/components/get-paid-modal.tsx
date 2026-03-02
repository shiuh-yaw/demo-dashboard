"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { formatCurrency } from "@dynamic-demos/utils";
import {
  Building2,
  Wallet,
  CreditCard as CreditCardIcon,
  Loader2,
} from "lucide-react";
import { useMintUsdc } from "@/hooks/use-mint-usdc";
import { ModalErrorBoundary } from "@/components/ui/error-boundary";
import { showErrorToast, showSuccessToast } from "@/lib/error-handling";
import { OptionCard } from "@/components/ui/option-card";

type Destination = "prepaid-card" | "bank-account" | "wallet";

interface GetPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAmount: string;
  apy: string;
  onConfirm: (destination: Destination, amount: string) => Promise<void>;
}

const getDestinations = () => [
  {
    id: "bank-account" as Destination,
    title: "Bank Account",
    description: "PIX transfer",
    timing: "Instant (24/7)",
    icon: "bank",
  },
  {
    id: "wallet" as Destination,
    title: "Wallet or Exchange",
    description: "Send to Nubank, Mercado Bitcoin, Lemon, Mynt",
    timing: "Instant (24/7)",
    icon: "wallet",
  },
  {
    id: "prepaid-card" as Destination,
    title: "Prepaid Card",
    description: "Use for purchases online and in stores accepting Visa",
    timing: "Instant (24/7)",
    icon: "card",
  },
];

export function GetPaidModal({
  isOpen,
  onClose,
  availableAmount,
  apy,
  onConfirm,
}: GetPaidModalProps) {
  const [selectedDestination, setSelectedDestination] =
    useState<Destination>("bank-account");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { isPending: isMinting, mintUsdc } = useMintUsdc({
    onSuccess: () => {
      showSuccessToast(`Successfully received ${formatCurrency(availableAmount)}`);
      onClose();
      setSelectedDestination("bank-account");
      setError(null);
      router.refresh();
    },
    onError: (err) => {
      setError(err.message);
      showErrorToast(err);
    },
  });

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      // Get paid = mint the actual displayed payout value (available to request)
      const amountInDollars = parseFloat(availableAmount);
      if (isNaN(amountInDollars) || amountInDollars <= 0) {
        throw new Error("Invalid amount");
      }
      await mintUsdc({ amountDollars: amountInDollars });
      // Still notify parent for any extra handling (e.g. analytics)
      await onConfirm(selectedDestination, availableAmount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process payment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const destinations = getDestinations();
  const isProcessing = isSubmitting || isMinting;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isProcessing && onClose()}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-5">
        <ModalErrorBoundary>
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between pr-8">
              <div>
                <DialogTitle>Get paid</DialogTitle>
                <DialogDescription className="text-earn-text-secondary mt-1">
                  Choose where to send your earnings
                </DialogDescription>
              </div>
              <p className="text-base font-medium text-earn-text-primary">
                {formatCurrency(availableAmount)}
              </p>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Destination Selector */}
            <div>
              <Label className="text-sm font-medium text-earn-text-primary mb-3 block">
                Destination
              </Label>
              <div className="space-y-2">
                {destinations.map((dest) => {
                  const IconComponent = 
                    dest.icon === "bank" ? Building2 :
                    dest.icon === "wallet" ? Wallet :
                    CreditCardIcon;
                  
                  return (
                    <OptionCard
                      key={dest.id}
                      icon={<IconComponent className="w-5 h-5 text-earn-text-secondary" />}
                      title={dest.title}
                      description={dest.description}
                      timing={dest.timing}
                      selected={selectedDestination === dest.id}
                      disabled={isProcessing}
                      onClick={() => !isProcessing && setSelectedDestination(dest.id)}
                    />
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isMinting ? "Minting USDC..." : "Processing..."}
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </ModalErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
