"use client";

/**
 * Rain card application screen.
 *
 * Gated behind the shared `DynamicGate` (init done); auth/redirect via
 * `useUser`. Signed-out users go back to `/`; signed-in users who already
 * have a `rainCard` (the apply route already ran for them) skip straight
 * to `/card`.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@dynamic-labs-sdk/react-hooks";
import { WidgetCard } from "@dynamic-demos/ui";
import { FullScreenSpinner } from "@/components/dynamic-gate";
import { getRainCardFromUser } from "@/lib/rain-card";
import { ApplicationForm } from "@/components/application/application-form";

export default function ApplyPage() {
  const router = useRouter();
  const { data: user, isPlaceholderData } = useUser();
  const hasCard = Boolean(getRainCardFromUser(user));

  useEffect(() => {
    if (isPlaceholderData) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (hasCard) router.replace("/card");
  }, [isPlaceholderData, user, hasCard, router]);

  if (isPlaceholderData || !user || hasCard) {
    return <FullScreenSpinner />;
  }

  return (
    <WidgetCard
      title="Apply for your card"
      subtitle="A few details for identity verification (sandbox, auto-approved)"
    >
      <ApplicationForm />
    </WidgetCard>
  );
}
