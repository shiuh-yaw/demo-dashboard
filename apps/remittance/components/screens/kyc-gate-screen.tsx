"use client";

import { useState, useEffect } from "react";
import { WidgetCard, Button, Input } from "@dynamic-demos/ui";
import { Spinner } from "@dynamic-demos/ui";
import { Shield, CheckCircle, Wallet } from "lucide-react";
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

type KycStep =
  | "info"
  | "address"
  | "confirm"
  | "verifying"
  | "creating-wallet"
  | "approved";

export function KycGateScreen({ navigation }: KycGateScreenProps) {
  const [step, setStep] = useState<KycStep>("info");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [walletError, setWalletError] = useState<string | null>(null);

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("address");
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("confirm");
  };

  const handleConfirm = () => {
    setStep("verifying");
    setTimeout(() => {
      void (async () => {
        try {
          const token = await getAuthToken();
          if (token) {
            await fetch("/api/kyc/approve", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
            navigation.refetchKyc();
          }
        } catch {
          // Continue to wallet creation even if metadata update fails
        }
        setStep("creating-wallet");
      })();
    }, 2000);
  };

  useEffect(() => {
    if (step !== "creating-wallet") return;

    let cancelled = false;

    async function provisionWallet() {
      try {
        const missingChains = getChainsMissingWaasWalletAccounts();
        if (missingChains.length > 0) {
          await createWaasWalletAccounts({ chains: missingChains });
        }
        if (!cancelled) {
          setStep("approved");
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
  }, [step, navigation]);

  const handleRetryWallet = () => {
    setWalletError(null);
    setStep("creating-wallet");
  };

  if (step === "verifying") {
    return (
      <WidgetCard>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-(--widget-muted)">
            Verifying your identity...
          </p>
        </div>
      </WidgetCard>
    );
  }

  if (step === "creating-wallet") {
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
              <p className="text-xs text-(--widget-muted) text-center max-w-[240px]">
                {walletError}
              </p>
              <Button onClick={handleRetryWallet} className="mt-2">
                Retry
              </Button>
            </>
          ) : (
            <>
              <Spinner size="lg" />
              <p className="text-sm text-(--widget-muted)">
                Setting up your wallet...
              </p>
            </>
          )}
        </div>
      </WidgetCard>
    );
  }

  if (step === "approved") {
    return (
      <WidgetCard>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-(--widget-success)" />
          </div>
          <p className="text-sm font-medium text-(--widget-success)">
            You&apos;re all set!
          </p>
          <p className="text-xs text-(--widget-muted)">
            Redirecting to your dashboard...
          </p>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      icon={
        <Shield
          className="w-[18px] h-[18px] text-(--widget-fg)"
          strokeWidth={1.5}
        />
      }
      title="Identity Verification"
      subtitle={`Step ${step === "info" ? "1" : step === "address" ? "2" : "3"} of 3`}
    >
      {step === "info" && (
        <form onSubmit={handleInfoSubmit} className="space-y-3">
          <Input
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
          />
          <Input
            label="Date of Birth"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={!fullName || !dob}>
            Continue
          </Button>
        </form>
      )}

      {step === "address" && (
        <form onSubmit={handleAddressSubmit} className="space-y-3">
          <Input
            label="Country of Residence"
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="United States"
          />
          <Button type="submit" className="w-full" disabled={!country}>
            Continue
          </Button>
          <button
            type="button"
            onClick={() => setStep("info")}
            className="w-full text-xs text-(--widget-muted) hover:text-(--widget-fg)"
          >
            Back
          </button>
        </form>
      )}

      {step === "confirm" && (
        <div className="space-y-4">
          <div className="space-y-2 p-3 rounded-(--widget-radius) bg-(--widget-row-bg)">
            <div className="flex justify-between text-sm">
              <span className="text-(--widget-muted)">Name</span>
              <span className="font-medium">{fullName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-(--widget-muted)">Date of Birth</span>
              <span className="font-medium">{dob}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-(--widget-muted)">Country</span>
              <span className="font-medium">{country}</span>
            </div>
          </div>
          <Button className="w-full" onClick={handleConfirm}>
            Submit Verification
          </Button>
          <button
            type="button"
            onClick={() => setStep("address")}
            className="w-full text-xs text-(--widget-muted) hover:text-(--widget-fg)"
          >
            Back
          </button>
          <p className="text-xs text-center text-(--widget-muted)">
            This is a simulated KYC check for demo purposes
          </p>
        </div>
      )}
    </WidgetCard>
  );
}
