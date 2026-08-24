/**
 * Accounts analytics taxonomy.
 *
 * `AccountsMilestone` is the single source of truth for every event name this
 * app emits via `useTrack().milestone(...)`. Documented (trigger + props shape)
 * in `AGENTS.md`'s "Analytics taxonomy" section - keep both in sync. Renaming
 * any of these is a breaking analytics change.
 *
 * `signed_in` and `authenticated` are reused verbatim from the other demos so
 * the funnel joins across the fleet; the rest are this demo's own steps.
 *
 * Never put a wallet address, email, user id, or account id in props: identity
 * stays share-link-only. Props carry shape (chain, role, how the target was
 * identified), never who.
 */

export const ACCOUNTS_MILESTONES = [
  "signed_in",
  "authenticated",
  "account_created",
  "account_wallet_created",
  "wallet_transfer_sent",
  "wallet_message_signed",
  "signer_added",
  "member_added",
  "policy_updated",
] as const;

export type AccountsMilestone = (typeof ACCOUNTS_MILESTONES)[number];

/** Minimal storage shape - matches `Window.sessionStorage`, injectable for tests. */
export interface MinimalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const FIRED_KEY_PREFIX = "dd_accounts_milestone_fired:";

function defaultStorage(): MinimalStorage | undefined {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return undefined;
    }
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Has `name` already fired once in this tab session? */
export function hasFiredOnceThisSession(
  name: AccountsMilestone,
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
  name: AccountsMilestone,
  storage: MinimalStorage | undefined = defaultStorage(),
): void {
  try {
    storage?.setItem(FIRED_KEY_PREFIX + name, "1");
  } catch {
    // fail-silent: storage writes can throw under storage restrictions
  }
}

/**
 * Emit `name` at most once per tab session.
 *
 * For milestones whose trigger re-evaluates on every render (auth success),
 * as opposed to the action milestones, which fire per action by design - a
 * second wallet created in one session is a second `account_wallet_created`.
 */
export function emitOnce(
  name: AccountsMilestone,
  emit: (name: AccountsMilestone) => void,
  storage?: MinimalStorage,
): void {
  if (hasFiredOnceThisSession(name, storage)) return;
  markFiredThisSession(name, storage);
  emit(name);
}
