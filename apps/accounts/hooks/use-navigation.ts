"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusinessAccountWalletSummary, OTPVerification } from "@/lib/dynamic";
import type { DestinationRule } from "@/lib/dynamic/policies";

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
      type: "wallet-settings";
      businessAccountId: string;
      wallet: BusinessAccountWalletSummary;
    }
  | {
      type: "wallet-policies";
      businessAccountId: string;
      wallet: BusinessAccountWalletSummary;
      /** Set for a signer's own layer; absent for the wallet's. */
      signer?: { shareSetId: string; label: string };
    }
  | {
      type: "policy-addresses";
      businessAccountId: string;
      wallet: BusinessAccountWalletSummary;
      signer?: { shareSetId: string; label: string };
    }
  | {
      type: "policy-limits";
      businessAccountId: string;
      wallet: BusinessAccountWalletSummary;
      signer?: { shareSetId: string; label: string };
    }
  | {
      type: "policy-destination";
      businessAccountId: string;
      wallet: BusinessAccountWalletSummary;
      /** Which layer the rule belongs to, carried through from the list. */
      signer?: { shareSetId: string; label: string };
      /** Absent when adding one. */
      rule?: DestinationRule;
    }
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

/**
 * How far a screen sits below the thing it is about.
 *
 * Settings nest - a wallet's rules are three Backs from the wallet itself - and
 * pressing Back that many times to leave is the complaint this answers. The
 * settings LEVEL is 1 and a chosen setting is 2, so every screen a settings
 * screen opens carries a close that leaves in one move.
 *
 * Unlisted screens (a send, a signature, the wallet itself) get no close: they
 * are the destination, not a detour.
 */
const WALLET_SETTING_DEPTH: Partial<Record<Screen["type"], number>> = {
  "wallet-settings": 1,
  "wallet-signers": 2,
  "wallet-policies": 2,
  "add-signer": 3,
  "policy-addresses": 3,
  "policy-limits": 3,
  "policy-destination": 4,
};

/**
 * The account screen IS the settings level for everything under it, so its
 * children are already a selected setting - depth 2 - and carry the close. The
 * wallet subtree counts the same way: `wallet-settings` is the level, and what
 * it opens sits below.
 */
const ACCOUNT_SETTING_DEPTH: Partial<Record<Screen["type"], number>> = {
  wallets: 2,
  members: 2,
  "rename-account": 2,
  "add-member": 3,
  "add-wallet": 3,
};

const AUTH_SCREENS = new Set<Screen["type"]>(["auth", "otp-verify"]);

export function isAuthScreen(screen: Screen): boolean {
  return AUTH_SCREENS.has(screen.type);
}

/** Matches wallet's `TRANSITION_DURATION` - the two widgets move alike. */
const TRANSITION_DURATION = 150;

export interface NavigationReturn {
  screen: Screen;
  /**
   * Leaves a nested settings screen in one move, or undefined when Back
   * already does that. Screens pass it straight to `WidgetCard`'s `onClose`,
   * which hides the control when it is undefined.
   */
  closeToRoot?: () => void;
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
  goToWalletSettings: (
    businessAccountId: string,
    wallet: BusinessAccountWalletSummary,
  ) => void;
  goToWalletPolicies: (
    businessAccountId: string,
    wallet: BusinessAccountWalletSummary,
    signer?: { shareSetId: string; label: string },
  ) => void;
  goToPolicyAddresses: (
    businessAccountId: string,
    wallet: BusinessAccountWalletSummary,
    signer?: { shareSetId: string; label: string },
  ) => void;
  goToPolicyLimits: (
    businessAccountId: string,
    wallet: BusinessAccountWalletSummary,
    signer?: { shareSetId: string; label: string },
  ) => void;
  goToPolicyDestination: (
    businessAccountId: string,
    wallet: BusinessAccountWalletSummary,
    options?: {
      signer?: { shareSetId: string; label: string };
      rule?: DestinationRule;
    },
  ) => void;
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

  const goToWalletSettings = useCallback(
    (businessAccountId: string, wallet: BusinessAccountWalletSummary) =>
      transitionTo({ type: "wallet-settings", businessAccountId, wallet }),
    [transitionTo],
  );

  const goToWalletPolicies = useCallback(
    (
      businessAccountId: string,
      wallet: BusinessAccountWalletSummary,
      signer?: { shareSetId: string; label: string },
    ) =>
      transitionTo({
        type: "wallet-policies",
        businessAccountId,
        wallet,
        signer,
      }),
    [transitionTo],
  );

  const goToPolicyAddresses = useCallback(
    (
      businessAccountId: string,
      wallet: BusinessAccountWalletSummary,
      signer?: { shareSetId: string; label: string },
    ) =>
      transitionTo({
        type: "policy-addresses",
        businessAccountId,
        wallet,
        signer,
      }),
    [transitionTo],
  );

  const goToPolicyLimits = useCallback(
    (
      businessAccountId: string,
      wallet: BusinessAccountWalletSummary,
      signer?: { shareSetId: string; label: string },
    ) =>
      transitionTo({ type: "policy-limits", businessAccountId, wallet, signer }),
    [transitionTo],
  );

  const goToPolicyDestination = useCallback(
    (
      businessAccountId: string,
      wallet: BusinessAccountWalletSummary,
      options?: {
        signer?: { shareSetId: string; label: string };
        rule?: DestinationRule;
      },
    ) =>
      transitionTo({
        type: "policy-destination",
        businessAccountId,
        wallet,
        signer: options?.signer,
        rule: options?.rule,
      }),
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

  // The wallet's own screen for a wallet setting, the account's for an account
  // setting - whichever root the current screen hangs off.
  const closeToRoot = useCallback(() => {
    if ("wallet" in screen && WALLET_SETTING_DEPTH[screen.type]) {
      transitionTo({
        type: "wallet-transactions",
        businessAccountId: screen.businessAccountId,
        wallet: screen.wallet,
      });
      return;
    }
    if ("businessAccountId" in screen) {
      transitionTo({
        type: "account",
        businessAccountId: screen.businessAccountId,
      });
    }
  }, [screen, transitionTo]);

  const depth =
    ("wallet" in screen ? WALLET_SETTING_DEPTH[screen.type] : undefined) ??
    ACCOUNT_SETTING_DEPTH[screen.type] ??
    0;

  const onAuthScreen = AUTH_SCREENS.has(screen.type);
  const isReady = isLoggedIn ? !onAuthScreen : onAuthScreen;

  return {
    screen,
    // Only past the first level: at depth 1 the close and the Back would do the
    // same thing, and two controls for one move is worse than none.
    closeToRoot: depth > 1 ? closeToRoot : undefined,
    isReady,
    isTransitioning,
    goToAuth,
    goToOtpVerify,
    goToAccounts,
    goToCreateAccount,
    goToAccount,
    goToRenameAccount,
    goToWallets,
    goToWalletSettings,
    goToWalletPolicies,
    goToPolicyAddresses,
    goToPolicyLimits,
    goToPolicyDestination,
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
