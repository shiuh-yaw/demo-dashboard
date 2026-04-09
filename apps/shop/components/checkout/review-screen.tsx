"use client";

import { Button } from "@dynamic-demos/ui";
import { useCheckout } from "@/lib/checkout-context";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@dynamic-demos/utils";

export function ReviewScreen() {
  const { selectedToken, confirmPayment, isProcessing, error } = useCheckout();
  const { totalPrice } = useCart();

  if (!selectedToken) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Token info */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        {selectedToken.logoURI && (
          <img
            src={selectedToken.logoURI}
            alt=""
            className="h-8 w-8 rounded-full"
          />
        )}
        <div className="flex-1">
          <p className="font-medium text-sm text-foreground">
            Paying with {selectedToken.symbol}
          </p>
          <p className="text-xs text-muted-foreground">
            Balance: {selectedToken.balance.toFixed(4)} {selectedToken.symbol}
          </p>
        </div>
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Payment amount</span>
          <span className="text-foreground">{formatCurrency(totalPrice)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Exact fees and route will be calculated after confirmation.
        </p>
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      {/* Actions */}
      <Button
        variant="primary"
        className="w-full"
        onClick={confirmPayment}
        disabled={isProcessing}
      >
        {isProcessing ? "Processing..." : "Confirm Payment"}
      </Button>
    </div>
  );
}
