"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useKycStatus } from "@/hooks/use-kyc-status";
import { useClientInitialized } from "@/hooks/use-client-initialized";
import { WidgetCard, Spinner } from "@dynamic-demos/ui";
import { KycGateScreen } from "@/components/screens/kyc-gate-screen";

/**
 * KYC page. Renders KycGateScreen and redirects when complete.
 */
export function KycPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/";

  const isClientReady = useClientInitialized();
  const isLoggedIn = useAuth();
  const { kycApproved, refetch: refetchKyc } = useKycStatus(isLoggedIn);

  const navigation = {
    refetchKyc,
    goToDashboard: () => router.push(returnTo),
  };

  useEffect(() => {
    if (!isClientReady || !isLoggedIn) return;
    if (kycApproved) router.replace(returnTo);
  }, [isClientReady, isLoggedIn, kycApproved, router, returnTo]);

  if (!isClientReady) {
    return (
      <WidgetCard>
        <div className="flex items-center justify-center min-h-64">
          <Spinner size="lg" />
        </div>
      </WidgetCard>
    );
  }

  return <KycGateScreen navigation={navigation} />;
}
