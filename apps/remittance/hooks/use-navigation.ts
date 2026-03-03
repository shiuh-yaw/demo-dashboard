"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { OTPVerification, NetworkData } from "@/lib/dynamic";
import { useKycStatus } from "@/hooks/use-kyc-status";

export type Screen =
  | { type: "auth" }
  | { type: "otp-verify"; email: string; otpVerification: OTPVerification }
  | { type: "kyc-gate" }
  | { type: "dashboard" }
  | { type: "receive"; walletAddress: string }
  | {
      type: "send";
      walletAddress: string;
    }
  | {
      type: "withdraw";
      walletAddress: string;
    }
  | { type: "tx-result"; txHash: string; networkData: NetworkData }
  | {
      type: "tx-history";
      walletAddress: string;
      networkId: number;
    }
  | { type: "coming-soon"; feature: string };

export interface NavigationReturn {
  screen: Screen;
  isReady: boolean;
  isTransitioning: boolean;
  refetchKyc: () => void;
  goToAuth: () => void;
  goToOtpVerify: (email: string, otpVerification: OTPVerification) => void;
  goToKycGate: () => void;
  goToDashboard: () => void;
  goToReceive: (walletAddress: string) => void;
  goToSend: (walletAddress: string) => void;
  goToWithdraw: (walletAddress: string) => void;
  goToTxResult: (txHash: string, networkData: NetworkData) => void;
  goToTxHistory: (walletAddress: string, networkId: number) => void;
  goToComingSoon: (feature: string) => void;
}

const TRANSITION_DURATION = 150;

export interface UseNavigationOptions {
  /** Server-resolved auth. Avoids spinner while Dynamic SDK hydrates. */
  initialIsLoggedIn?: boolean;
  /** Server-resolved KYC status. Bypasses KYC gate for already-verified users. */
  initialKycApproved?: boolean;
}

export function useNavigation(
  isLoggedIn: boolean,
  options?: UseNavigationOptions,
): NavigationReturn {
  const { initialIsLoggedIn, initialKycApproved } = options ?? {};
  const {
    kycApproved,
    isLoading: kycLoading,
    refetch: refetchKyc,
  } = useKycStatus(isLoggedIn, { initialKycApproved });

  const effectiveLoggedIn = isLoggedIn || initialIsLoggedIn;
  const [screen, setScreen] = useState<Screen>(() =>
    !effectiveLoggedIn
      ? { type: "auth" }
      : initialKycApproved
        ? { type: "dashboard" }
        : { type: "kyc-gate" },
  );
  const [isTransitioning, setIsTransitioning] = useState(false);

  const prevIsLoggedIn = useRef(isLoggedIn);

  // Immediately correct if we're on kyc-gate but server says KYC is done (prevents flash)
  useEffect(() => {
    if (initialKycApproved && screen.type === "kyc-gate") {
      setScreen({ type: "dashboard" });
    }
  }, [initialKycApproved, screen.type]);

  const transitionTo = useCallback((newScreen: Screen) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setScreen(newScreen);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, []);

  useEffect(() => {
    const authChanged = prevIsLoggedIn.current !== isLoggedIn;
    prevIsLoggedIn.current = isLoggedIn;

    if (
      effectiveLoggedIn &&
      (screen.type === "auth" || screen.type === "otp-verify")
    ) {
      if (authChanged || screen.type === "otp-verify") {
        if (!kycLoading && kycApproved) {
          transitionTo({ type: "dashboard" });
        } else {
          transitionTo({ type: "kyc-gate" });
        }
      }
    }

    if (
      effectiveLoggedIn &&
      !kycLoading &&
      kycApproved &&
      screen.type === "kyc-gate"
    ) {
      transitionTo({ type: "dashboard" });
    }

    if (
      !effectiveLoggedIn &&
      screen.type !== "auth" &&
      screen.type !== "otp-verify"
    ) {
      transitionTo({ type: "auth" });
    }
  }, [
    effectiveLoggedIn,
    isLoggedIn,
    screen.type,
    kycApproved,
    kycLoading,
    transitionTo,
  ]);

  const goToAuth = useCallback(() => {
    transitionTo({ type: "auth" });
  }, [transitionTo]);

  const goToOtpVerify = useCallback(
    (email: string, otpVerification: OTPVerification) => {
      transitionTo({ type: "otp-verify", email, otpVerification });
    },
    [transitionTo],
  );

  const goToKycGate = useCallback(() => {
    transitionTo({ type: "kyc-gate" });
  }, [transitionTo]);

  const goToDashboard = useCallback(() => {
    transitionTo({ type: "dashboard" });
  }, [transitionTo]);

  const goToReceive = useCallback(
    (walletAddress: string) => {
      transitionTo({ type: "receive", walletAddress });
    },
    [transitionTo],
  );

  const goToSend = useCallback(
    (walletAddress: string) => {
      transitionTo({ type: "send", walletAddress });
    },
    [transitionTo],
  );

  const goToWithdraw = useCallback(
    (walletAddress: string) => {
      transitionTo({ type: "withdraw", walletAddress });
    },
    [transitionTo],
  );

  const goToTxResult = useCallback(
    (txHash: string, networkData: NetworkData) => {
      transitionTo({ type: "tx-result", txHash, networkData });
    },
    [transitionTo],
  );

  const goToTxHistory = useCallback(
    (walletAddress: string, networkId: number) => {
      transitionTo({ type: "tx-history", walletAddress, networkId });
    },
    [transitionTo],
  );

  const goToComingSoon = useCallback(
    (feature: string) => {
      transitionTo({ type: "coming-soon", feature });
    },
    [transitionTo],
  );

  const isAuthScreen = screen.type === "auth" || screen.type === "otp-verify";
  const isReady = effectiveLoggedIn ? !isAuthScreen : isAuthScreen;

  return {
    screen,
    isReady,
    isTransitioning,
    refetchKyc,
    goToAuth,
    goToOtpVerify,
    goToKycGate,
    goToDashboard,
    goToReceive,
    goToSend,
    goToWithdraw,
    goToTxResult,
    goToTxHistory,
    goToComingSoon,
  };
}
