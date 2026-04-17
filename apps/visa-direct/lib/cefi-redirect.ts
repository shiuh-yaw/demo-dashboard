/**
 * CeFi OAuth redirect state
 *
 * Persists a small marker across the Dynamic → Exchange → Dynamic OAuth
 * roundtrip so the payment-methods screen knows:
 *  1. That it should reopen the connect modal at the "connected" step
 *  2. Which exchange the user picked (so we can show the right branding
 *     and decide whether to auto-fetch the deposit address)
 *
 * React component state is lost across the full-page redirect, so this
 * lives in sessionStorage.
 *
 * Keeps the legacy "kraken-pending" key name for backwards compatibility
 * with the single-exchange era; any existing in-flight value is still
 * consumable.
 */

const LEGACY_KEY = "vd_kraken_oauth_pending";
const STORAGE_KEY = "vd_cefi_oauth_pending";

export interface CefiOAuthPending {
  /** Exchange key the user picked before redirecting (e.g. "kraken"). */
  exchange: string;
}

export function markCefiOAuthPending(state: CefiOAuthPending): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Legacy marker kept for the one-tick window where older code might
    // still read it; safe to remove once fully migrated.
    sessionStorage.setItem(LEGACY_KEY, "1");
  } catch {
    // sessionStorage unavailable (private mode / SSR) — OAuth still
    // works, the modal just won't auto-reopen on return.
  }
}

export function consumeCefiOAuthPending(): CefiOAuthPending | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const legacy = sessionStorage.getItem(LEGACY_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_KEY);
    if (raw) return JSON.parse(raw) as CefiOAuthPending;
    if (legacy === "1") return { exchange: "kraken" };
    return null;
  } catch {
    return null;
  }
}

export function hasPendingCefiOAuth(): boolean {
  try {
    return (
      sessionStorage.getItem(STORAGE_KEY) !== null ||
      sessionStorage.getItem(LEGACY_KEY) === "1"
    );
  } catch {
    return false;
  }
}
