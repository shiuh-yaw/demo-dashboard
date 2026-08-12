"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { OTPVerification, NetworkData } from "@/lib/dynamic";

// =============================================================================
// SCREEN TYPES (Single Source of Truth)
// =============================================================================

export type Screen =
  | { type: "auth" }
  | { type: "otp-verify"; email: string; otpVerification: OTPVerification }
  | { type: "jwt-generator" }
  | { type: "dashboard" }
  | {
      type: "authorize-7702";
      walletAddress: string;
      returnTo: "dashboard" | "send-tx" | "setup-mfa";
    }
  | {
      type: "setup-mfa";
      walletAddress: string;
      chain: string;
    }
  | {
      type: "send-tx";
      walletAddress: string;
      chain: string;
      fromMfaSetup?: boolean;
      returnToTxHistory?: { networkId: number };
      initialRecipient?: string;
    }
  | {
      type: "tx-result";
      txHash: string;
      networkData: NetworkData;
      walletAddress: string;
      chain: string;
    }
  | {
      type: "tx-history";
      walletAddress: string;
      chain: string;
      networkId: number;
    }
  | {
      type: "scan-qr";
      walletAddress: string;
      chain: string;
      networkId: number;
    }
  | { type: "add-wallet" }
  // Scoped to one wallet when opened from that wallet's gear; unscoped from
  // the dashboard gear, where it holds app-level demo controls.
  | {
      type: "settings";
      walletAddress?: string;
      chain?: string;
      returnToTxHistory?: { networkId: number };
    }
  | {
      type: "sign-message";
      walletAddress: string;
      chain: string;
      returnToTxHistory?: { networkId: number };
    };

// =============================================================================
// NAVIGATION HOOK
// =============================================================================

export interface NavigationReturn {
  screen: Screen;
  /** True when screen state is consistent with auth state */
  isReady: boolean;
  isTransitioning: boolean;
  goToAuth: () => void;
  goToJwtGenerator: () => void;
  goToOtpVerify: (email: string, otpVerification: OTPVerification) => void;
  goToDashboard: () => void;
  goToAuthorize7702: (
    walletAddress: string,
    returnTo: "dashboard" | "send-tx" | "setup-mfa",
  ) => void;
  goToSetupMfa: (walletAddress: string, chain: string) => void;
  goToSendTx: (
    walletAddress: string,
    chain: string,
    fromMfaSetup?: boolean,
    returnToTxHistory?: { networkId: number },
    initialRecipient?: string,
  ) => void;
  goToTxResult: (
    txHash: string,
    networkData: NetworkData,
    walletAddress: string,
    chain: string,
  ) => void;
  goToTxHistory: (
    walletAddress: string,
    chain: string,
    networkId: number,
  ) => void;
  goToScanQr: (
    walletAddress: string,
    chain: string,
    networkId: number,
  ) => void;
  goToAddWallet: () => void;
  goToSettings: (walletScope?: {
    walletAddress: string;
    chain: string;
    returnToTxHistory?: { networkId: number };
  }) => void;
  goToSignMessage: (
    walletAddress: string,
    chain: string,
    returnToTxHistory?: { networkId: number },
  ) => void;
}

const TRANSITION_DURATION = 150;

/**
 * Screen navigation state machine with auth-reactive redirects
 *
 * Initializes screen based on auth state to prevent flash of wrong screen.
 */
export function useNavigation(isLoggedIn: boolean): NavigationReturn {
  // Initialize screen based on current auth state to prevent flash
  const [screen, setScreen] = useState<Screen>(() =>
    isLoggedIn ? { type: "dashboard" } : { type: "auth" },
  );
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track previous isLoggedIn to detect changes (not initial state)
  const prevIsLoggedIn = useRef(isLoggedIn);

  // Transition helper with animation
  const transitionTo = useCallback((newScreen: Screen) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setScreen(newScreen);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, []);

  // Auto-redirect based on auth state changes
  useEffect(() => {
    // Only react to auth state changes, not initial state
    const authChanged = prevIsLoggedIn.current !== isLoggedIn;
    prevIsLoggedIn.current = isLoggedIn;

    // When logged in and on an auth-family screen, go to dashboard
    if (
      isLoggedIn &&
      (screen.type === "auth" ||
        screen.type === "otp-verify" ||
        screen.type === "jwt-generator")
    ) {
      // Always redirect if logged in on auth screens (handles both initial and changes)
      if (authChanged || screen.type === "otp-verify") {
        transitionTo({ type: "dashboard" });
      }
    }
    // When logged out and on protected screen, go to auth
    if (
      !isLoggedIn &&
      screen.type !== "auth" &&
      screen.type !== "otp-verify" &&
      screen.type !== "jwt-generator"
    ) {
      transitionTo({ type: "auth" });
    }
  }, [isLoggedIn, screen.type, transitionTo]);

  // Memoized navigation functions
  const goToAuth = useCallback(() => {
    transitionTo({ type: "auth" });
  }, [transitionTo]);

  const goToJwtGenerator = useCallback(() => {
    transitionTo({ type: "jwt-generator" });
  }, [transitionTo]);

  const goToOtpVerify = useCallback(
    (email: string, otpVerification: OTPVerification) => {
      transitionTo({ type: "otp-verify", email, otpVerification });
    },
    [transitionTo],
  );

  const goToDashboard = useCallback(() => {
    transitionTo({ type: "dashboard" });
  }, [transitionTo]);

  const goToAuthorize7702 = useCallback(
    (
      walletAddress: string,
      returnTo: "dashboard" | "send-tx" | "setup-mfa",
    ) => {
      transitionTo({ type: "authorize-7702", walletAddress, returnTo });
    },
    [transitionTo],
  );

  const goToSetupMfa = useCallback(
    (walletAddress: string, chain: string) => {
      transitionTo({ type: "setup-mfa", walletAddress, chain });
    },
    [transitionTo],
  );

  const goToSendTx = useCallback(
    (
      walletAddress: string,
      chain: string,
      fromMfaSetup?: boolean,
      returnToTxHistory?: { networkId: number },
      initialRecipient?: string,
    ) => {
      transitionTo({
        type: "send-tx",
        walletAddress,
        chain,
        fromMfaSetup,
        returnToTxHistory,
        initialRecipient,
      });
    },
    [transitionTo],
  );

  const goToTxResult = useCallback(
    (
      txHash: string,
      networkData: NetworkData,
      walletAddress: string,
      chain: string,
    ) => {
      transitionTo({
        type: "tx-result",
        txHash,
        networkData,
        walletAddress,
        chain,
      });
    },
    [transitionTo],
  );

  const goToTxHistory = useCallback(
    (walletAddress: string, chain: string, networkId: number) => {
      transitionTo({ type: "tx-history", walletAddress, chain, networkId });
    },
    [transitionTo],
  );

  const goToScanQr = useCallback(
    (walletAddress: string, chain: string, networkId: number) => {
      transitionTo({ type: "scan-qr", walletAddress, chain, networkId });
    },
    [transitionTo],
  );

  const goToAddWallet = useCallback(() => {
    transitionTo({ type: "add-wallet" });
  }, [transitionTo]);

  const goToSettings = useCallback(
    (walletScope?: {
      walletAddress: string;
      chain: string;
      returnToTxHistory?: { networkId: number };
    }) => {
      transitionTo({ type: "settings", ...walletScope });
    },
    [transitionTo],
  );

  const goToSignMessage = useCallback(
    (
      walletAddress: string,
      chain: string,
      returnToTxHistory?: { networkId: number },
    ) => {
      transitionTo({
        type: "sign-message",
        walletAddress,
        chain,
        returnToTxHistory,
      });
    },
    [transitionTo],
  );

  // Screen is ready when it matches expected state for auth
  // - Logged in: should NOT be on auth/otp-verify screens
  // - Logged out: should be on auth or otp-verify screens
  const isAuthScreen =
    screen.type === "auth" ||
    screen.type === "otp-verify" ||
    screen.type === "jwt-generator";
  const isReady = isLoggedIn ? !isAuthScreen : isAuthScreen;

  return {
    screen,
    isReady,
    isTransitioning,
    goToAuth,
    goToJwtGenerator,
    goToOtpVerify,
    goToDashboard,
    goToAuthorize7702,
    goToSetupMfa,
    goToSendTx,
    goToTxResult,
    goToTxHistory,
    goToScanQr,
    goToAddWallet,
    goToSettings,
    goToSignMessage,
  };
}
