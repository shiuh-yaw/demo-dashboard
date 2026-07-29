"use client";

/**
 * Card view. Gated the same way as `/apply` (see that file's header
 * comment): auth/redirect via `useUser`. Signed-out users go back to `/`;
 * signed-in users without a `rainCard` yet (apply hasn't run for them) go to
 * `/apply`.
 *
 * Renders the paginated `CardView` (main/deposit/activity screens, mirroring
 * apps/wallet's screen-navigation shape) - each screen owns its own
 * `WidgetCard`, so this page no longer wraps it in one. `enabled` only flips
 * true once a card exists, so the balance/transaction hooks never poll the
 * dashboard for a user with nothing to read.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@dynamic-labs-sdk/react-hooks";
import { FullScreenSpinner } from "@/components/dynamic-gate";
import { useRainCardStore } from "@dynamic-demos/rain/client";
import { CardView } from "@/components/dynamic-card/card-view";

export default function CardPage() {
  const router = useRouter();
  const { data: user, isPlaceholderData } = useUser();
  const { card } = useRainCardStore();

  useEffect(() => {
    if (isPlaceholderData) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (!card) router.replace("/apply");
  }, [isPlaceholderData, user, card, router]);

  if (isPlaceholderData || !user || !card) {
    return <FullScreenSpinner />;
  }

  return <CardView card={card} />;
}
