"use client";

import { useCallback } from "react";
import { KycGate } from "@dynamic-demos/ui";
import { useApproveKyc } from "@/hooks/use-kyc-status";

interface KycGateScreenProps {
  onComplete: () => void;
}

/**
 * Trade KYC gate: uses shared KycGate from packages/ui.
 * Replaces deprecated auto-advance mock.
 */
export function KycGateScreen({ onComplete }: KycGateScreenProps) {
  const approveKyc = useApproveKyc();

  const handleKycApprove = useCallback(
    () => approveKyc.mutateAsync(),
    [approveKyc],
  );

  return (
    <KycGate
      onKycApprove={handleKycApprove}
      onComplete={onComplete}
      theme="widget"
    />
  );
}
