"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@dynamic-demos/ui";
import { useCheckout } from "@/lib/checkout-context";
import { WalletConnectScreen } from "./wallet-connect-screen";
import { TokenSelectScreen } from "./token-select-screen";
import { ReviewScreen } from "./review-screen";
import { ProcessingScreen } from "./processing-screen";
import { ArrowLeft } from "lucide-react";

const SCREEN_TITLES: Record<string, string> = {
  "connect-wallet": "Connect Wallet",
  "select-token": "Select Payment Token",
  review: "Review Payment",
  processing: "Processing",
  complete: "Payment Complete",
};

export function CheckoutModal() {
  const { isOpen, screen, closeCheckout, goBack, isProcessing } = useCheckout();

  const canGoBack =
    screen === "select-token" || screen === "review";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeCheckout()}>
      <DialogContent
        showCloseButton={!isProcessing}
        className="bg-card border-border sm:max-w-md p-0 gap-0 overflow-hidden"
        onInteractOutside={(e) => {
          if (isProcessing) e.preventDefault();
        }}
      >
        <DialogHeader className="p-5 pb-0">
          <div className="flex items-center gap-3">
            {canGoBack && (
              <button
                onClick={goBack}
                className="p-1 -ml-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <DialogTitle className="text-foreground">
              {SCREEN_TITLES[screen] ?? "Checkout"}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Checkout flow for your cart items
          </DialogDescription>
        </DialogHeader>

        <div className="p-5">
          {screen === "connect-wallet" && <WalletConnectScreen />}
          {screen === "select-token" && <TokenSelectScreen />}
          {screen === "review" && <ReviewScreen />}
          {(screen === "processing" || screen === "complete") && (
            <ProcessingScreen />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
