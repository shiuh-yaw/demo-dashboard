"use client";

/**
 * Paginated card view - owns the `/card` screen-navigation state machine
 * (main/deposit/activity, mirroring apps/wallet/components/wallet-app.tsx's
 * screen-union switch inside an opacity-transition wrapper; see
 * hooks/use-card-navigation.ts for the state machine itself) and the
 * card-details reveal state via `useCardDetails` - the single source of
 * truth for `pan`/`cvc`/`revealed`, passed to the card face
 * (`CreditCardVisual`, rendered on the main screen) which both displays the
 * values and hosts the reveal/hide toggle + copy icons. All data hooks are
 * unchanged from their pre-existing implementations; this is presentational
 * + navigation only.
 *
 * Also owns auto-reissue: if the stored `rainCard` isn't resolvable by the
 * current `RAIN_API_KEY` (`useBalance` returns a "not found" error - see
 * `lib/is-card-not-found.ts`), silently create a fresh per-user card
 * (`useReissueCard`) and recover. Guarded by `triedRef` so this fires at
 * most once per mount even if the balance keeps erroring after a failed
 * reissue attempt - the `CardBalanceRow` "Unavailable" fallback (already
 * implemented) takes over from there instead of looping.
 */

import { useEffect, useRef } from "react";

import type { RainCard } from "@/lib/rain-card";
import { isCardNotFound } from "@/lib/is-card-not-found";
import { useCardDetails } from "@/hooks/use-card-details";
import { useCardNavigation } from "@/hooks/use-card-navigation";
import { useBalance } from "@/hooks/use-balance";
import { useReissueCard } from "@/hooks/use-reissue-card";
import { useAutoFaucet } from "@/hooks/use-auto-faucet";
import { FullScreenSpinner } from "@/components/dynamic-gate";

import { MainScreen } from "@/components/dynamic-card/screens/main";
import { DepositScreen } from "@/components/dynamic-card/screens/deposit";
import { ActivityScreen } from "@/components/dynamic-card/screens/activity";

export interface CardViewProps {
  card: RainCard;
}

export function CardView({ card }: CardViewProps) {
  const navigation = useCardNavigation();
  const { screen, isTransitioning } = navigation;
  const { reveal, hide, pan, cvc, isRevealing, error } = useCardDetails();
  const revealed = pan !== null && cvc !== null;

  const balance = useBalance(true);
  const reissue = useReissueCard();
  const triedRef = useRef(false);

  // First-ever visit: mint starter test-USDC so the card is immediately
  // fundable (gated per-user; no-op after the first run).
  useAutoFaucet();
  const notFound = isCardNotFound(balance.isError, balance.error);

  useEffect(() => {
    if (notFound && !triedRef.current && !reissue.isPending) {
      triedRef.current = true;
      void reissue.mutateAsync().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notFound, reissue.isPending]);

  const handleToggleReveal = () => {
    if (revealed) {
      hide();
      return;
    }
    void reveal();
  };

  if (reissue.isPending) {
    return <FullScreenSpinner caption="Setting up your card..." />;
  }

  return (
    <div
      className={`transition-opacity duration-150 ${
        isTransitioning ? "opacity-50" : "opacity-100"
      }`}
    >
      {screen === "main" && (
        <MainScreen
          card={card}
          navigation={navigation}
          pan={pan}
          cvc={cvc}
          revealed={revealed}
          isRevealing={isRevealing}
          revealError={error}
          onToggleReveal={handleToggleReveal}
        />
      )}

      {screen === "deposit" && <DepositScreen navigation={navigation} />}

      {screen === "activity" && <ActivityScreen navigation={navigation} />}
    </div>
  );
}
