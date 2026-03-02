"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@dynamic-demos/ui";
import { GetPaidModal } from "@/components/get-paid-modal";
import { useMintUsdc } from "@/hooks/use-mint-usdc";
import { cn } from "@dynamic-demos/utils";
import { Loader2, Check } from "lucide-react";

const SUCCESS_DISPLAY_MS = 1600;

interface GetPaidButtonProps {
  availableAmount: string;
  apy: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
  showHelperText?: boolean;
  /** When true, click initiates mint directly (no modal). Modal code remains but is not opened. */
  directMint?: boolean;
  /** Called after mint succeeds and success checkmark is shown. Receives minted amount. Use to refresh creator balance / payout demo state. */
  onMintSuccess?: (amount: number) => void;
}

export function GetPaidButton({
  availableAmount,
  apy,
  variant = "default",
  size = "default",
  className,
  children,
  showHelperText = false,
  directMint = false,
  onMintSuccess,
}: GetPaidButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const lastMintedAmountRef = useRef(0);
  const router = useRouter();

  // Use default text if no children provided
  const buttonLabel = children ?? "Get paid";

  const { isPending: isMinting, mintUsdc } = useMintUsdc({
    onSuccess: () => setShowSuccess(true),
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (!showSuccess) return;
    const amount = lastMintedAmountRef.current;
    const t = setTimeout(() => {
      setShowSuccess(false);
      onMintSuccess?.(amount);
      router.refresh();
    }, SUCCESS_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [showSuccess, onMintSuccess, router]);

  const handleConfirm = async (_destination: string, _amount: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    router.refresh();
  };

  const available = parseFloat(availableAmount);
  const hasAvailable = available > 0;
  // Mint the actual displayed payout value (available to request), not a capped amount
  const mintAmount = available;

  const handleDirectMint = async () => {
    if (!hasAvailable || mintAmount <= 0) return;
    lastMintedAmountRef.current = mintAmount;
    try {
      await mintUsdc({ amountDollars: mintAmount });
    } catch {
      // Error is shown via mintError from hook
    }
  };

  // Loading: show spinner without the button (same treatment as success)
  if (directMint && isMinting) {
    const loadingSpinner = (
      <div
        className="inline-flex h-9 min-w-9 items-center justify-center"
        role="status"
        aria-label="Processing payout"
      >
        <Loader2 className="h-6 w-6 animate-spin text-earn-text-primary" />
      </div>
    );
    return showHelperText ? (
      <div className={cn("flex flex-col", className)}>
        {loadingSpinner}
        {!hasAvailable && (
          <p className="text-xs text-earn-text-secondary mt-2 text-center">
            No payouts available to request
          </p>
        )}
      </div>
    ) : (
      loadingSpinner
    );
  }

  // Success: show check animated in without the button
  if (directMint && showSuccess) {
    const successMark = (
      <div
        className="inline-flex h-9 min-w-9 items-center justify-center"
        role="status"
        aria-label="Payout successful"
      >
        <span
          className="flex h-8 w-8 origin-center items-center justify-center rounded-full bg-[#137333] text-white shadow-[0_2px_8px_rgba(19,115,51,0.35)]"
          style={{
            animation: "get-paid-check 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <Check className="h-5 w-5" strokeWidth={2.5} />
        </span>
      </div>
    );
    return showHelperText ? (
      <div className={cn("flex flex-col", className)}>
        {successMark}
        {!hasAvailable && (
          <p className="text-xs text-earn-text-secondary mt-2 text-center">
            No payouts available to request
          </p>
        )}
      </div>
    ) : (
      successMark
    );
  }

  // Idle: show button
  if (directMint) {
    return showHelperText ? (
      <div className={cn("flex flex-col", className)}>
        <Button
          variant={variant}
          size={size}
          onClick={handleDirectMint}
          disabled={!hasAvailable}
          className={!hasAvailable ? "opacity-50 cursor-not-allowed" : ""}
          data-get-paid-button
        >
          {buttonLabel}
        </Button>
        {!hasAvailable && (
          <p className="text-xs text-earn-text-secondary mt-2 text-center">
            No payouts available to request
          </p>
        )}
      </div>
    ) : (
      <Button
        variant={variant}
        size={size}
        onClick={handleDirectMint}
        disabled={!hasAvailable}
        className={cn(!hasAvailable && "opacity-50 cursor-not-allowed", className)}
        data-get-paid-button
      >
        {buttonLabel}
      </Button>
    );
  }

  return (
    <>
      {showHelperText ? (
        <div className={cn("flex flex-col", className)}>
          <Button
            variant={variant}
            size={size}
            onClick={() => setIsModalOpen(true)}
            disabled={!hasAvailable}
            className={!hasAvailable ? "opacity-50 cursor-not-allowed" : ""}
            data-get-paid-button
          >
            {buttonLabel}
          </Button>
          {!hasAvailable && (
            <p className="text-xs text-earn-text-secondary mt-2 text-center">
              No payouts available to request
            </p>
          )}
        </div>
      ) : (
        <Button
          variant={variant}
          size={size}
          onClick={() => setIsModalOpen(true)}
          disabled={!hasAvailable}
          className={cn(!hasAvailable && "opacity-50 cursor-not-allowed", className)}
          data-get-paid-button
        >
          {buttonLabel}
        </Button>
      )}
      <GetPaidModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        availableAmount={availableAmount}
        apy={apy}
        onConfirm={handleConfirm}
      />
    </>
  );
}

