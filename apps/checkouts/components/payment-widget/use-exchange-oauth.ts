"use client";

/**
 * Exchange OAuth Hook
 *
 * Manages the exchange connection lifecycle: initiating OAuth redirects,
 * detecting return from OAuth, completing authentication, and tracking
 * the active exchange key.
 *
 * Separated from index.tsx (widget orchestrator) for single-responsibility.
 *
 * @module components/payment-widget/use-exchange-oauth
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  authenticateWithSocial,
  detectOAuthRedirect,
  completeSocialAuthentication,
} from "@/lib/dynamicClient";
import {
  saveExchangeRedirectState,
  consumeExchangeRedirectState,
} from "@/lib/exchanges";
import type { ExchangeProvider } from "@/lib/exchanges";
import type { WidgetMode } from "@/lib/widget-config";

// =============================================================================
// TYPES
// =============================================================================

interface UseExchangeOAuthOptions {
  /** Widget mode (deposit or payment) */
  mode: WidgetMode;
  /** Get current payment/deposit amount */
  getCurrentAmount: () => number;
  /** Navigate to asset selector */
  goToAssets: (amount?: number) => void;
  /** Navigate to connect screen */
  goToConnect: (amount?: number) => void;
  /** Navigate to deposit amount screen */
  goToDepositAmount: () => void;
}

interface UseExchangeOAuthReturn {
  /** Currently active exchange key (null = wallet mode) */
  activeExchangeKey: string | null;
  /** Set the active exchange key */
  setActiveExchangeKey: (key: string | null) => void;
  /** Handle exchange selection from wallet selector (initiates OAuth) */
  handleExchangeSelect: (exchange: ExchangeProvider) => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useExchangeOAuth(
  options: UseExchangeOAuthOptions,
): UseExchangeOAuthReturn {
  const { mode, getCurrentAmount, goToAssets, goToConnect, goToDepositAmount } =
    options;

  // Active exchange key — when set, the asset selector fetches exchange balances
  // instead of wallet balances. When null, wallet mode (existing behavior).
  const [activeExchangeKey, setActiveExchangeKey] = useState<string | null>(
    null,
  );

  // ===========================================================================
  // INITIATE EXCHANGE OAUTH
  // ===========================================================================

  /**
   * Handle exchange selection from the wallet selector screen.
   * Stores widget state in sessionStorage, then initiates OAuth redirect.
   */
  const handleExchangeSelect = useCallback(
    async (exchange: ExchangeProvider) => {
      try {
        // Persist state so we can restore it after the OAuth redirect returns
        saveExchangeRedirectState({
          exchangeKey: exchange.key,
          depositAmount: getCurrentAmount(),
        });

        await authenticateWithSocial({
          provider: exchange.socialProvider,
          redirectUrl: window.location.href,
        });
        // User will be redirected to exchange OAuth page.
        // On return, the useEffect below detects the redirect.
      } catch (err) {
        console.error("[ExchangeOAuth] OAuth initiation failed:", err);
      }
    },
    [getCurrentAmount],
  );

  // ===========================================================================
  // DETECT OAUTH REDIRECT ON MOUNT
  // ===========================================================================

  /**
   * Detect OAuth redirect on mount and complete the exchange connection.
   * Runs once when the widget loads to check if the user is returning
   * from an exchange OAuth flow (e.g., Kraken authorization).
   *
   * The widget starts on the "exchange-connecting" screen (loading spinner)
   * if sessionStorage contains a pending redirect, so the user doesn't see
   * a flash of the deposit-amount screen.
   */
  const oauthHandled = useRef(false);
  useEffect(() => {
    if (oauthHandled.current) return;

    const handleOAuthReturn = async () => {
      // Read and clear stored redirect state (exchange key + deposit amount)
      const redirectState = consumeExchangeRedirectState();

      try {
        const isRedirect = await detectOAuthRedirect();
        if (!isRedirect) {
          // Not an OAuth redirect — if we started on exchange-connecting
          // by mistake (stale sessionStorage), go to the normal initial screen.
          if (redirectState) {
            if (mode === "deposit") goToDepositAmount();
            else goToConnect(redirectState.depositAmount);
          }
          return;
        }

        oauthHandled.current = true;

        // Complete the social authentication (this logs the user in).
        // Must happen before cleaning URL params since the SDK reads them.
        await completeSocialAuthentication();

        // Strip OAuth params from the URL so a page refresh
        // doesn't land on the loading screen again.
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("dynamicOauthCode");
        cleanUrl.searchParams.delete("dynamicOauthState");
        window.history.replaceState({}, "", cleanUrl.toString());

        const amount = redirectState?.depositAmount ?? getCurrentAmount();
        const exchangeKey = redirectState?.exchangeKey;

        // Set the active exchange so the asset selector fetches exchange balances
        if (exchangeKey) {
          setActiveExchangeKey(exchangeKey);
        }

        // Whitelisting is checked after token selection (in handleTokenSelect),
        // not here, because Kraken whitelists by address+token pair.
        goToAssets(amount);
      } catch (err) {
        console.error("[ExchangeOAuth] OAuth redirect handling failed:", err);
        // On error, navigate to a sensible screen
        if (mode === "deposit") goToDepositAmount();
        else goToAssets(redirectState?.depositAmount);
      }
    };

    handleOAuthReturn();
  }, [mode, getCurrentAmount, goToAssets, goToConnect, goToDepositAmount]);

  return {
    activeExchangeKey,
    setActiveExchangeKey,
    handleExchangeSelect,
  };
}
