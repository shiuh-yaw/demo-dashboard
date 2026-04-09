"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { useCart } from "./cart-context";
import {
  isSignedIn,
  getPrimaryWalletAccount,
  getWalletDisplayName,
  getActiveNetworkData,
  createCheckoutTransaction,
  attachCheckoutTransactionSource,
  getCheckoutTransactionQuote,
  submitCheckoutTransaction,
  getCheckoutTransaction,
  cancelCheckoutTransaction,
  isTerminalState,
  isSuccessState,
  isFailedState,
  type CheckoutTransaction,
} from "./checkout-sdk";

// =============================================================================
// TYPES
// =============================================================================

/** TokenBalance from the SDK's getBalances API */
export type TokenBalance = {
  networkId?: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  balance: number;
  rawBalance: number;
  price?: number;
  marketValue?: number;
  isNative?: boolean;
};

export type CheckoutScreen =
  | "connect-wallet"
  | "select-token"
  | "review"
  | "processing"
  | "complete";

export type SigningStep = "approval" | "transaction" | null;

interface CheckoutContextValue {
  isOpen: boolean;
  screen: CheckoutScreen;
  selectedToken: TokenBalance | null;
  transaction: CheckoutTransaction | null;
  signingStep: SigningStep;
  error: string | null;
  isProcessing: boolean;
  walletDisplayName: string;
  openCheckout: () => void;
  closeCheckout: () => void;
  selectToken: (token: TokenBalance) => void;
  confirmPayment: () => Promise<void>;
  pollingTimedOut: boolean;
  checkStatus: () => void;
  goBack: () => void;
  clearError: () => void;
  setScreen: (screen: CheckoutScreen) => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

export const CheckoutProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { totalPrice, clearCart } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState<CheckoutScreen>("connect-wallet");
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);
  const [transaction, setTransaction] = useState<CheckoutTransaction | null>(
    null,
  );
  const [signingStep, setSigningStep] = useState<SigningStep>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletDisplayName, setWalletDisplayName] = useState("your wallet");
  const [pollingTimedOut, setPollingTimedOut] = useState(false);

  const pollingRef = useRef(false);
  const transactionIdRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    pollingRef.current = false;
    transactionIdRef.current = null;
    setScreen("connect-wallet");
    setSelectedToken(null);
    setTransaction(null);
    setSigningStep(null);
    setError(null);
    setIsProcessing(false);
    setWalletDisplayName("your wallet");
    setPollingTimedOut(false);
  }, []);

  const openCheckout = useCallback(() => {
    reset();
    const wallet = getPrimaryWalletAccount();
    if (wallet) {
      setWalletDisplayName(getWalletDisplayName(wallet));
    }
    setScreen(isSignedIn() ? "select-token" : "connect-wallet");
    setIsOpen(true);
  }, [reset]);

  const closeCheckout = useCallback(() => {
    if (isProcessing) return;
    // Cancel any in-flight transaction
    if (transactionIdRef.current) {
      cancelCheckoutTransaction({
        transactionId: transactionIdRef.current,
      }).catch(() => {});
    }
    setIsOpen(false);
    reset();
  }, [isProcessing, reset]);

  const selectToken = useCallback((token: TokenBalance) => {
    setSelectedToken(token);
    setScreen("review");
  }, []);

  // Poll for transaction status until terminal (3s interval, 120s timeout)
  const pollStatus = useCallback(
    async (transactionId: string) => {
      pollingRef.current = true;
      const pollStart = Date.now();
      const POLL_TIMEOUT = 15000;

      while (pollingRef.current) {
        await new Promise((r) => setTimeout(r, 3000));
        if (!pollingRef.current) break;

        try {
          const tx = await getCheckoutTransaction({ transactionId });
          setTransaction(tx);

          if (isTerminalState(tx)) {
            pollingRef.current = false;
            setIsProcessing(false);

            if (isSuccessState(tx)) {
              setScreen("complete");
              clearCart();
            } else if (isFailedState(tx)) {
              setError(tx.failure?.message ?? "Transaction failed");
            }
            return;
          }

          // Timeout — stop polling, show check status button
          if (Date.now() - pollStart >= POLL_TIMEOUT) {
            pollingRef.current = false;
            setIsProcessing(false);
            setPollingTimedOut(true);
            return;
          }
        } catch {
          // Continue polling on transient errors
        }
      }
    },
    [clearCart],
  );

  const confirmPayment = useCallback(async () => {
    if (!selectedToken) return;
    setError(null);
    setIsProcessing(true);
    setScreen("processing");

    try {
      // 1. Create checkout config server-side (needs API key)
      const checkoutRes = await fetch("/api/checkout", { method: "POST" });
      if (!checkoutRes.ok) {
        const err = await checkoutRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create checkout config");
      }
      const { checkoutId } = await checkoutRes.json();

      // 2. Create checkout transaction client-side via SDK
      const { transaction: tx } = await createCheckoutTransaction({
        amount: totalPrice.toFixed(2),
        currency: "USD",
        checkoutId,
      });
      setTransaction(tx);
      const transactionId = tx.id;
      transactionIdRef.current = transactionId;

      // 3. Get wallet and attach as payment source
      const wallet = getPrimaryWalletAccount();
      if (!wallet) {
        setError("No wallet connected");
        setIsProcessing(false);
        return;
      }

      const { networkData } = await getActiveNetworkData({
        walletAccount: wallet,
      });
      const attached = await attachCheckoutTransactionSource({
        transactionId,
        fromAddress: wallet.address,
        fromChainId: String(networkData?.networkId ?? ""),
        fromChainName: wallet.chain,
      });
      setTransaction(attached);

      // 4. Get quote for selected token
      const quoted = await getCheckoutTransactionQuote({
        transactionId,
        fromTokenAddress: selectedToken.address,
      });
      setTransaction(quoted);

      // 5. Submit — prepares, signs with wallet, broadcasts
      const submitted = await submitCheckoutTransaction({
        transactionId,
        walletAccount: wallet,
        onStepChange: (step) => setSigningStep(step),
      });
      setTransaction(submitted);
      setSigningStep(null);

      // 6. Poll for settlement
      pollStatus(transactionId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed";

      if (msg.toLowerCase().includes("unauthorized")) {
        // Stale auth session — user needs to reconnect
        setError("Session expired. Please reconnect your wallet.");
        setIsProcessing(false);
        setScreen("connect-wallet");
        return;
      }

      if (msg.toLowerCase().includes("reject")) {
        // User rejected in wallet — cancel and go back
        if (transactionIdRef.current) {
          cancelCheckoutTransaction({
            transactionId: transactionIdRef.current,
          }).catch(() => {});
        }
        setError("Transaction rejected");
      } else {
        setError(msg);
      }
      setIsProcessing(false);
      setSigningStep(null);
    }
  }, [selectedToken, totalPrice, pollStatus]);

  const checkStatus = useCallback(() => {
    if (!transactionIdRef.current) return;
    setPollingTimedOut(false);
    setIsProcessing(true);
    pollStatus(transactionIdRef.current);
  }, [pollStatus]);

  const goBack = useCallback(() => {
    setError(null);
    switch (screen) {
      case "select-token":
        setScreen("connect-wallet");
        break;
      case "review":
        setSelectedToken(null);
        setTransaction(null);
        setScreen("select-token");
        break;
      default:
        break;
    }
  }, [screen]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <CheckoutContext.Provider
      value={{
        isOpen,
        screen,
        selectedToken,
        transaction,
        signingStep,
        error,
        isProcessing,
        walletDisplayName,
        openCheckout,
        closeCheckout,
        selectToken,
        pollingTimedOut,
        checkStatus,
        confirmPayment,
        goBack,
        clearError,
        setScreen,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within CheckoutProvider");
  return ctx;
}
