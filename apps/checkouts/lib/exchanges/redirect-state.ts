/**
 * Exchange OAuth Redirect State
 *
 * Persists widget state in sessionStorage before an OAuth redirect
 * so it can be restored when the user returns from the exchange's
 * authorization page.
 *
 * @module lib/exchanges/redirect-state
 */

const STORAGE_KEY = "exchange_oauth_redirect";

export interface ExchangeRedirectState {
  /** Exchange key (e.g., "kraken") */
  exchangeKey: string;
  /** Deposit amount the user entered before redirect */
  depositAmount: number;
}

/**
 * Save redirect state before initiating OAuth.
 * Called right before `authenticateWithSocial` redirects the user.
 */
export function saveExchangeRedirectState(state: ExchangeRedirectState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage may not be available (SSR, private browsing)
  }
}

/**
 * Read and clear the saved redirect state.
 * Called on mount to check if the user is returning from an OAuth redirect.
 * Returns null if no state is stored.
 */
export function consumeExchangeRedirectState(): ExchangeRedirectState | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    sessionStorage.removeItem(STORAGE_KEY);
    return JSON.parse(stored) as ExchangeRedirectState;
  } catch {
    return null;
  }
}

/**
 * Check if there is a pending exchange redirect (without consuming it).
 * Used to determine the initial screen on mount.
 */
export function hasPendingExchangeRedirect(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
