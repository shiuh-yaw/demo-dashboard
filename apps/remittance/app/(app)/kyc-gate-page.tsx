"use client";

import { useRouter } from "next/navigation";
import { RemittanceAuthLayout } from "@/components/ui/remittance-auth-layout";
import { KycGateScreen } from "@/components/screens/kyc-gate-screen";
import { useLogout } from "@/hooks/use-mutations";

export function KycGatePage() {
  const router = useRouter();
  const logoutMutation = useLogout();

  const navigation = {
    refetchKyc: () => router.refresh(),
    goToDashboard: () => router.refresh(),
  };

  return (
    <RemittanceAuthLayout>
      <div className="w-full space-y-3">
        <KycGateScreen navigation={navigation} />
        <button
          onClick={() =>
            logoutMutation.mutate(undefined, {
              onSuccess: () => {
                window.location.href = "/login";
              },
            })
          }
          disabled={logoutMutation.isPending}
          className="w-full text-xs text-(--widget-muted) hover:text-(--widget-fg) transition-colors disabled:opacity-50 cursor-pointer"
        >
          {logoutMutation.isPending ? "Logging out…" : "Log out"}
        </button>
      </div>
    </RemittanceAuthLayout>
  );
}
