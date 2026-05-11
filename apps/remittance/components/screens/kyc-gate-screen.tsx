"use client";

import { useState, useEffect } from "react";
import { KycGate, WidgetCard, Button, Spinner } from "@dynamic-demos/ui";
import { CheckCircle, Wallet } from "lucide-react";
import {
  createWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts,
  getAuthToken,
} from "@/lib/dynamic";

export interface KycGateNavigation {
  refetchKyc: () => void;
  goToDashboard: () => void;
}

interface KycGateScreenProps {
  navigation: KycGateNavigation;
}

type PostKycStep = "creating-wallet" | "approved";

/**
 * Remittance KYC gate: uses shared KycGate for form, then runs wallet creation.
 * Per spec: KYC and wallet creation are separate; wallet creation runs after KYC.
 */
export function KycGateScreen({ navigation }: KycGateScreenProps) {
  const [postKycStep, setPostKycStep] = useState<PostKycStep | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  const handleKycApprove = async () => {
    const token = await getAuthToken();
    if (token) {
      await fetch("/api/kyc/approve", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    navigation.refetchKyc();
  };

  const handleKycComplete = () => {
    setPostKycStep("creating-wallet");
  };

  useEffect(() => {
    if (postKycStep !== "creating-wallet") return;

    let cancelled = false;

    async function provisionWallet() {
      try {
        const missingChains = getChainsMissingWaasWalletAccounts();
        if (missingChains.length > 0) {
          await createWaasWalletAccounts({ chains: missingChains });
        }
        if (!cancelled) {
          setPostKycStep("approved");
          setTimeout(() => navigation.goToDashboard(), 1200);
        }
      } catch (err) {
        if (!cancelled) {
          setWalletError(
            err instanceof Error ? err.message : "Failed to create wallet",
          );
        }
      }
    }

    provisionWallet();
    return () => {
      cancelled = true;
    };
  }, [postKycStep, navigation]);

  const handleRetryWallet = () => {
    setWalletError(null);
    setPostKycStep("creating-wallet");
  };

  if (postKycStep === "creating-wallet") {
    return (
      <WidgetCard>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          {walletError ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-500">
                Wallet creation failed
              </p>
              <p className="text-xs text-(--brand-muted) text-center max-w-[240px]">
                {walletError}
              </p>
              <Button onClick={handleRetryWallet} className="mt-2">
                Retry
              </Button>
            </>
          ) : (
            <>
              <Spinner size="lg" />
              <p className="text-sm text-(--brand-muted)">
                Setting up your wallet...
              </p>
            </>
          )}
        </div>
      </WidgetCard>
    );
  }

  if (postKycStep === "approved") {
    return (
      <WidgetCard>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-(--brand-success)" />
          </div>
          <p className="text-sm font-medium text-(--brand-success)">
            You&apos;re all set!
          </p>
          <p className="text-xs text-(--brand-muted)">
            Redirecting to your dashboard...
          </p>
        </div>
      </WidgetCard>
    );
  }

  return (
    <KycGate
      onKycApprove={handleKycApprove}
      onComplete={handleKycComplete}
      theme="widget"
    />
  );
}
