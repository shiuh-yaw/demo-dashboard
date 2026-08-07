/**
 * Remembering which email belongs to which member.
 *
 * `BusinessAccountMember` carries `userId` and no identifier, and there is no
 * client-side call that resolves another user's identity - so a roster the app
 * did not build itself can only be rendered as uuids. The one moment the
 * pairing is known is at invite time: the address was typed into this app, and
 * `addBusinessAccountMember` returns the `userId` it resolved to. This records
 * that pairing so the members and signers lists can show the address.
 *
 * Device-local on purpose. These are other people's email addresses, so they
 * stay in the browser that did the inviting rather than being written to a
 * shared store. The consequence, and it is the honest one to state: a member
 * added from another browser still shows as a uuid. The real fix is the API
 * returning member identity.
 *
 * Never an authorization input. Every permission decision still comes from the
 * server's view of the account (`view.ts`); this only decides what text a row
 * displays.
 *
 * The pure functions carry the logic and the two `localStorage` wrappers stay
 * thin, so the merge and eviction rules are unit-testable without a DOM.
 */

/** `businessAccountId` -> `userId` -> email. */
export type MemberEmails = Record<string, Record<string, string>>;

const STORAGE_KEY = "accounts-demo:member-emails";

/** Bounds growth for someone who demos against many accounts. */
const MAX_ACCOUNTS = 25;

/**
 * Parse stored JSON, discarding anything that is not the expected shape.
 *
 * Tolerant rather than throwing: this is a display cache, and a corrupt entry
 * should cost a uuid on screen, not a crashed screen.
 */
export function parseMemberEmails(raw: string | null): MemberEmails {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  const result: MemberEmails = {};
  for (const [accountId, members] of Object.entries(parsed)) {
    if (!members || typeof members !== "object" || Array.isArray(members)) {
      continue;
    }
    const entries = Object.entries(members).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    );
    if (entries.length) result[accountId] = Object.fromEntries(entries);
  }
  return result;
}

/**
 * The directory with one pairing added.
 *
 * Returns a new object rather than mutating, and re-inserts the touched account
 * last so the eviction below drops the least recently written account.
 */
export function withMemberEmail(
  directory: MemberEmails,
  businessAccountId: string,
  userId: string,
  email: string,
): MemberEmails {
  const address = email.trim();
  if (!businessAccountId || !userId || !address) return directory;

  const { [businessAccountId]: existing, ...rest } = directory;
  const updated: MemberEmails = {
    ...rest,
    [businessAccountId]: { ...existing, [userId]: address },
  };

  const accountIds = Object.keys(updated);
  if (accountIds.length <= MAX_ACCOUNTS) return updated;
  return Object.fromEntries(
    accountIds.slice(accountIds.length - MAX_ACCOUNTS).map((id) => [
      id,
      updated[id]!,
    ]),
  );
}

/** Reads the whole directory. `{}` on the server, or with storage unavailable. */
export function readMemberEmails(): MemberEmails {
  if (typeof window === "undefined") return {};
  try {
    return parseMemberEmails(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Private-mode Safari and storage-disabled browsers throw on access.
    return {};
  }
}

/** Records one pairing. Silent when storage is unavailable - it is a cache. */
export function rememberMemberEmail(
  businessAccountId: string,
  userId: string | null | undefined,
  email: string | null | undefined,
): void {
  if (typeof window === "undefined" || !userId || !email) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        withMemberEmail(readMemberEmails(), businessAccountId, userId, email),
      ),
    );
  } catch {
    // Ignored: losing the cache costs a uuid on screen, nothing more.
  }
}
