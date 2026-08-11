/**
 * Wallet analytics taxonomy - GTM Phase 09.
 *
 * `WalletMilestone` is the single source of truth for every event name this
 * app emits via `useTrack().milestone(...)`. Documented (trigger + props
 * shape) in `AGENTS.md`'s "Analytics taxonomy" section - keep both in sync.
 */

export const WALLET_MILESTONES = [
  "signed_in",
  "authenticated",
  "wallet_funded",
  "send_initiated",
  "send_completed",
  "backup_completed",
  "receive_viewed",
  "message_signed",
] as const;

export type WalletMilestone = (typeof WALLET_MILESTONES)[number];

/** Minimal storage shape - matches `Window.sessionStorage`, injectable for tests. */
export interface MinimalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const FIRED_KEY_PREFIX = "dd_wallet_milestone_fired:";

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
  name: WalletMilestone,
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
  name: WalletMilestone,
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
 * whose trigger condition (auth success, first positive balance) can
 * legitimately re-evaluate on every render/poll without re-firing the event.
 */
export function emitOnce(
  name: WalletMilestone,
  emit: (name: WalletMilestone) => void,
  storage?: MinimalStorage,
): void {
  if (hasFiredOnceThisSession(name, storage)) return;
  markFiredThisSession(name, storage);
  emit(name);
}

/**
 * Fires `wallet_funded` (via `emit`, expected to be `emitOnce`-wrapped) the
 * first time any balance in `balances` is observed to be greater than zero.
 */
export function maybeTrackWalletFunded(
  balances: ReadonlyArray<{ balance: number }>,
  emit: (name: WalletMilestone) => void,
): void {
  if (balances.some((b) => b.balance > 0)) {
    emit("wallet_funded");
  }
}
