"use client";

/**
 * KycGate — Single canonical KYC flow for all apps.
 *
 * Form flow: info (name, DOB) → address (country) → confirm → verify → onKycApprove → onComplete.
 * Wallet creation is NOT part of KYC — run as separate step after onComplete when configured.
 *
 * @see docs/superpowers/specs/2025-03-20-unified-app-bootstrap-design.md §4
 */

import { useState } from "react";
import { WidgetCard, Button, Input, Spinner } from "@dynamic-demos/ui";
import { Shield } from "lucide-react";

export interface KycGateProps {
  /** Called after KYC is approved (API called successfully). Parent may refetch, then handle wallet creation. */
  onComplete: () => void;
  /** Parent implements the approve API call. Called when user clicks Submit Verification. */
  onKycApprove: () => Promise<void>;
  theme?: "widget" | "trade";
}

type KycStep = "info" | "address" | "confirm" | "verifying";

const DEFAULT_FULL_NAME = "John Doe";
const DEFAULT_DOB = "01/15/1990";
const DEFAULT_COUNTRY = "United States";

/** Digits-only mask: 01151990 -> 01/15/1990 as the user types. */
function formatDobInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function KycGate({ onComplete, onKycApprove }: KycGateProps) {
  const [step, setStep] = useState<KycStep>("info");
  const [fullName, setFullName] = useState(DEFAULT_FULL_NAME);
  const [dob, setDob] = useState(DEFAULT_DOB);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [error, setError] = useState<string | null>(null);

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("address");
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setStep("verifying");
    setError(null);
    try {
      await onKycApprove();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setStep("confirm");
    }
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
          {/* Masked text beats type="date" here: the native calendar
              popup is unstylable and paging back to a birth year is
              miserable - typing 8 digits isn't. */}
          <Input
            label="Date of Birth"
            type="text"
            inputMode="numeric"
            value={dob}
            onChange={(e) => setDob(formatDobInput(e.target.value))}
            placeholder="MM/DD/YYYY"
          />
          <Button
            type="submit"
            className="w-full"
            disabled={!fullName || dob.length !== 10}
          >
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
        </form>
      )}

      {step === "confirm" && (
        <div className="space-y-3">
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
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <Button className="w-full" onClick={handleConfirm}>
            Submit Verification
          </Button>
          <p className="text-xs text-center text-(--widget-muted)">
            This is a simulated KYC check for demo purposes. In production,
            identity verification is typically powered by providers such as
            Sumsub, Onfido, or Jumio.
          </p>
        </div>
      )}
    </WidgetCard>
  );
}
