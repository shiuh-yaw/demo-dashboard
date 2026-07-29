"use client";

/**
 * Screen navigation state machine for `/card` - mirrors
 * apps/wallet/hooks/use-navigation.ts's `transitionTo` + `goToX` shape,
 * scoped down to the card's three screens. No auth-reactivity needed here
 * (unlike wallet's hook): the page-level `useUser` redirect guard in
 * `app/card/page.tsx` already handles signed-out/no-card redirects before
 * `CardView` ever mounts.
 */

import { useCallback, useState } from "react";

export type CardScreen = "main" | "deposit" | "activity";

export interface CardNavigationReturn {
  screen: CardScreen;
  isTransitioning: boolean;
  goToMain: () => void;
  goToDeposit: () => void;
  goToActivity: () => void;
}

const TRANSITION_DURATION = 150;

export function useCardNavigation(): CardNavigationReturn {
  const [screen, setScreen] = useState<CardScreen>("main");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const transitionTo = useCallback((next: CardScreen) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setScreen(next);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, []);

  const goToMain = useCallback(() => transitionTo("main"), [transitionTo]);
  const goToDeposit = useCallback(
    () => transitionTo("deposit"),
    [transitionTo],
  );
  const goToActivity = useCallback(
    () => transitionTo("activity"),
    [transitionTo],
  );

  return { screen, isTransitioning, goToMain, goToDeposit, goToActivity };
}
