/**
 * Card analytics taxonomy - GTM instrumentation.
 *
 * `CardMilestone` is the single source of truth for every event name this
 * app emits via `useTrack().milestone(...)`. Documented (trigger + props
 * shape) in `AGENTS.md`'s "Analytics taxonomy" section - keep both in sync.
 * `signed_in` / `authenticated` / `wallet_funded` deliberately reuse the
 * wallet pilot's names and semantics so the two demos stay comparable and
 * share the same person-level join keys for enrichment.
 *
 * Person-level identity resolution (`resolveUserIdentity` / `resolveUserEmail`)
 * is shared across demos - it lives in `@dynamic-demos/analytics` so getting
 * the email off the Dynamic user is identical in every app.
 */

export const CARD_MILESTONES = [
  "signed_in",
  "authenticated",
  "card_created",
  "card_viewed",
  "card_details_revealed",
  "wallet_funded",
  "deposit_initiated",
  "deposit_completed",
  "usdc_minted",
] as const;

export type CardMilestone = (typeof CARD_MILESTONES)[number];

/** Minimal storage shape - matches `Window.sessionStorage`, injectable for tests. */
export interface MinimalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const FIRED_KEY_PREFIX = "dd_card_milestone_fired:";

function defaultStorage(): MinimalStorage | undefined {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return undefined;
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Has `name` already fired once in this tab session (sessionStorage-backed)? */
export function hasFiredOnceThisSession(
  name: CardMilestone,
  storage: MinimalStorage | undefined = defaultStorage(),
): boolean {
  try {
    return storage?.getItem(FIRED_KEY_PREFIX + name) === "1";
  } catch {
    return false;
  }
}

/** Mark `name` as fired for the rest of this tab session. */
export function markFiredThisSession(
  name: CardMilestone,
  storage: MinimalStorage | undefined = defaultStorage(),
): void {
  try {
    storage?.setItem(FIRED_KEY_PREFIX + name, "1");
  } catch {
    // fail-silent: storage writes can throw under storage restrictions
  }
}

/**
 * Emit `name` via `emit` at most once per tab session. Used for milestones
 * whose trigger condition (auth success, first positive balance, screen
 * mount) can legitimately re-evaluate on every render/poll without
 * re-firing the event.
 */
export function emitOnce(
  name: CardMilestone,
  emit: (name: CardMilestone) => void,
  storage?: MinimalStorage,
): void {
  if (hasFiredOnceThisSession(name, storage)) return;
  markFiredThisSession(name, storage);
  emit(name);
}

/**
 * Fires `wallet_funded` (via `emit`, expected to be `emitOnce`-wrapped) the
 * first time the observed RUSDC wallet balance is greater than zero.
 * `balance` is the parsed numeric balance; `undefined`/`NaN` never fires.
 */
export function maybeTrackWalletFunded(
  balance: number | undefined,
  emit: (name: CardMilestone) => void,
): void {
  if (balance !== undefined && !Number.isNaN(balance) && balance > 0) {
    emit("wallet_funded");
  }
}
