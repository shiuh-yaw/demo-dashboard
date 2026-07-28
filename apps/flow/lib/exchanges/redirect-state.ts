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
  exchangeKey: string;
  depositAmount: number;
}

export function saveExchangeRedirectState(state: ExchangeRedirectState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage may not be available (SSR, private browsing)
  }
}

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

export function hasPendingExchangeRedirect(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * The post-auth return target to hand the OAuth provider: the current page
 * minus any fragment. The "#exchange" deep-link marker set before the redirect
 * must NOT leak into the redirect URL, or the provider sends the user back to
 * `...#exchange` and it sticks in the address bar. Query params (share link,
 * theme) are preserved; screen restoration reads sessionStorage, not the hash,
 * so dropping the fragment is safe.
 */
export function exchangeOAuthReturnUrl(href: string): string {
  const url = new URL(href);
  url.hash = "";
  return url.toString();
}
