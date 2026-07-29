/**
 * Pure decision function behind the auto-reissue trigger in
 * `components/dynamic-card/card-view.tsx`. The dashboard 404s with
 * "No card found" when the verified JWT carries no resolvable `rainCard`
 * (stale session token issued before the card was written, a card from a
 * different Rain env, or a purged sandbox card) - `getRainCardOr404` in
 * `apps/dashboard/src/lib/rain/user.ts`. Reissue (which refreshes the session)
 * heals it. Matches the dashboard's "No card found" as well as generic
 * "not found" / "card not found" wording. A `$0` balance is a SUCCESS (data
 * present, no error) and must never match here - only an actual error does.
 */
export function isCardNotFound(
  isError: boolean,
  error: { message?: string } | null | undefined,
): boolean {
  if (!isError) return false;
  return /no card found|not\s*found/i.test(error?.message ?? "");
}
