"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusinessAccountWalletSummary, OTPVerification } from "@/lib/dynamic";

/**
 * Screen state machine for the widget, with auth-reactive redirects.
 *
 * The screen carries the ids the SDK calls need (`businessAccountId`, the
 * target wallet) rather than reading them from a separate store, so a screen
 * can never act on a different account than the one it is showing.
 */
export type Screen =
  | { type: "auth" }
  | { type: "otp-verify"; email: string; otpVerification: OTPVerification }
  | { type: "accounts" }
  | { type: "create-account" }
  | { type: "account"; businessAccountId: string }
  | { type: "rename-account"; businessAccountId: string; currentName: string }
  | { type: "wallets"; businessAccountId: string }
  | {
      type: "wallet-signers";
      businessAccountId: string;
      wallet: BusinessAccountWalletSummary;
    }
  | {
      type: "wallet-transactions";
      businessAccountId: string;
      wallet: BusinessAccountWalletSummary;
    }
  | {
      type: "sign-message";
      businessAccountId: string;
      wallet: BusinessAccountWalletSummary;
    }
  | {
      type: "send";
      businessAccountId: string;
      wallet: BusinessAccountWalletSummary;
    }
  | { type: "add-wallet"; businessAccountId: string }
  | {
      type: "add-signer";
      businessAccountId: string;
      wallet: BusinessAccountWalletSummary;
    }
  | { type: "members"; businessAccountId: string }
  | { type: "add-member"; businessAccountId: string };

const AUTH_SCREENS = new Set<Screen["type"]>(["auth", "otp-verify"]);

export function isAuthScreen(screen: Screen): boolean {
  return AUTH_SCREENS.has(screen.type);
}

/** Matches wallet's `TRANSITION_DURATION` - the two widgets move alike. */
const TRANSITION_DURATION = 150;

export interface NavigationReturn {
  screen: Screen;
  /** True when screen state is consistent with auth state. */
  isReady: boolean;
  /** Dims the widget while the swap happens (see `accounts-app.tsx`). */
  isTransitioning: boolean;
  goToAuth: () => void;
  goToOtpVerify: (email: string, otpVerification: OTPVerification) => void;
  goToAccounts: () => void;
  goToCreateAccount: () => void;
  goToAccount: (businessAccountId: string) => void;
  goToRenameAccount: (businessAccountId: string, currentName: string) => void;
  goToWallets: (businessAccountId: string) => void;
  goToWalletSigners: (
    businessAccountId: string,
    wallet: BusinessAccountWalletSummary,
  ) => void;
  goToWalletTransactions: (
    businessAccountId: string,
    wallet: BusinessAccountWalletSummary,
  ) => void;
  goToSend: (
    businessAccountId: string,
    wallet: BusinessAccountWalletSummary,
  ) => void;
  goToSignMessage: (
    businessAccountId: string,
    wallet: BusinessAccountWalletSummary,
  ) => void;
  goToAddWallet: (businessAccountId: string) => void;
  goToAddSigner: (
    businessAccountId: string,
    wallet: BusinessAccountWalletSummary,
  ) => void;
  goToMembers: (businessAccountId: string) => void;
  goToAddMember: (businessAccountId: string) => void;
}

export function useNavigation(isLoggedIn: boolean): NavigationReturn {
  // Seed from the current auth state so a restored session never flashes the
  // login card.
  const [screen, setScreen] = useState<Screen>(() =>
    isLoggedIn ? { type: "accounts" } : { type: "auth" },
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevIsLoggedIn = useRef(isLoggedIn);

  // Exactly wallet's transition: dim, swap after the dim has played, undim.
  // Nothing per-screen animates, so the widget never changes height or position
  // mid-move - which is what made the earlier slide read as a flash.
  const transitionTo = useCallback((next: Screen) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setScreen(next);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, []);

  useEffect(() => {
    const authChanged = prevIsLoggedIn.current !== isLoggedIn;
    prevIsLoggedIn.current = isLoggedIn;

    if (isLoggedIn && AUTH_SCREENS.has(screen.type)) {
      if (authChanged || screen.type === "otp-verify") {
        transitionTo({ type: "accounts" });
      }
      return;
    }
    if (!isLoggedIn && !AUTH_SCREENS.has(screen.type)) {
      transitionTo({ type: "auth" });
    }
  }, [isLoggedIn, screen.type, transitionTo]);

  const goToAuth = useCallback(
    () => transitionTo({ type: "auth" }),
    [transitionTo],
  );

  const goToOtpVerify = useCallback(
    (email: string, otpVerification: OTPVerification) =>
      transitionTo({ type: "otp-verify", email, otpVerification }),
    [transitionTo],
  );

  const goToAccounts = useCallback(
    () => transitionTo({ type: "accounts" }),
    [transitionTo],
  );

  const goToCreateAccount = useCallback(
    () => transitionTo({ type: "create-account" }),
    [transitionTo],
  );

  const goToAccount = useCallback(
    (businessAccountId: string) =>
      transitionTo({ type: "account", businessAccountId }),
    [transitionTo],
  );

  const goToRenameAccount = useCallback(
    (businessAccountId: string, currentName: string) =>
      transitionTo({ type: "rename-account", businessAccountId, currentName }),
    [transitionTo],
  );

  const goToWallets = useCallback(
    (businessAccountId: string) =>
      transitionTo({ type: "wallets", businessAccountId }),
    [transitionTo],
  );

  const goToWalletSigners = useCallback(
    (businessAccountId: string, wallet: BusinessAccountWalletSummary) =>
      transitionTo({ type: "wallet-signers", businessAccountId, wallet }),
    [transitionTo],
  );

  const goToWalletTransactions = useCallback(
    (businessAccountId: string, wallet: BusinessAccountWalletSummary) =>
      transitionTo({ type: "wallet-transactions", businessAccountId, wallet }),
    [transitionTo],
  );

  const goToSend = useCallback(
    (businessAccountId: string, wallet: BusinessAccountWalletSummary) =>
      transitionTo({ type: "send", businessAccountId, wallet }),
    [transitionTo],
  );

  const goToSignMessage = useCallback(
    (businessAccountId: string, wallet: BusinessAccountWalletSummary) =>
      transitionTo({ type: "sign-message", businessAccountId, wallet }),
    [transitionTo],
  );

  const goToAddWallet = useCallback(
    (businessAccountId: string) =>
      transitionTo({ type: "add-wallet", businessAccountId }),
    [transitionTo],
  );

  const goToAddSigner = useCallback(
    (businessAccountId: string, wallet: BusinessAccountWalletSummary) =>
      transitionTo({ type: "add-signer", businessAccountId, wallet }),
    [transitionTo],
  );

  const goToMembers = useCallback(
    (businessAccountId: string) =>
      transitionTo({ type: "members", businessAccountId }),
    [transitionTo],
  );

  const goToAddMember = useCallback(
    (businessAccountId: string) =>
      transitionTo({ type: "add-member", businessAccountId }),
    [transitionTo],
  );

  const onAuthScreen = AUTH_SCREENS.has(screen.type);
  const isReady = isLoggedIn ? !onAuthScreen : onAuthScreen;

  return {
    screen,
    isReady,
    isTransitioning,
    goToAuth,
    goToOtpVerify,
    goToAccounts,
    goToCreateAccount,
    goToAccount,
    goToRenameAccount,
    goToWallets,
    goToWalletSigners,
    goToWalletTransactions,
    goToSend,
    goToSignMessage,
    goToAddWallet,
    goToAddSigner,
    goToMembers,
    goToAddMember,
  };
}
