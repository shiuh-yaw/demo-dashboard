/**
 * Person-level identity resolution off a Dynamic user - shared by every demo
 * that emits an `authenticated`-style milestone so the extraction is
 * IDENTICAL across apps (card, wallet, ...). Pure and structurally typed: no
 * `@dynamic-labs-sdk` import, the SDK's `SdkUser` structurally satisfies
 * `DynamicIdentityUser`.
 *
 * Email precedence: the top-level `user.email` is Dynamic's source of truth
 * and is set for every method that verifies one (email-OTP, and social/OAuth
 * once the user has settled). The verified-credential fallbacks are a
 * defensive net for providers/configs that only expose the email inside a
 * credential (`email`, `oauthEmails`, or an email-shaped `publicIdentifier`).
 */

interface MinimalVerifiedCredential {
  format?: string | null;
  email?: string | null;
  oauthEmails?: string[] | null;
  publicIdentifier?: string | null;
}

/** Minimal shape of the Dynamic user this module reads (`SdkUser` satisfies it). */
export interface DynamicIdentityUser {
  id?: string | null;
  email?: string | null;
  verifiedCredentials?: MinimalVerifiedCredential[] | null;
}

/** Person-level join keys carried on an `authenticated` milestone. */
export interface UserIdentity {
  dynamicUserId: string;
  email?: string;
}

function looksLikeEmail(value: string | null | undefined): value is string {
  return typeof value === "string" && value.includes("@");
}

/** The verified email across every auth method, or undefined when none. */
export function resolveUserEmail(
  user: DynamicIdentityUser | null | undefined,
): string | undefined {
  if (looksLikeEmail(user?.email)) return user.email;
  for (const cred of user?.verifiedCredentials ?? []) {
    if (looksLikeEmail(cred.email)) return cred.email;
    const oauthEmail = cred.oauthEmails?.find(looksLikeEmail);
    if (oauthEmail) return oauthEmail;
    if (looksLikeEmail(cred.publicIdentifier)) return cred.publicIdentifier;
  }
  return undefined;
}

/**
 * Person-level identity for the `authenticated` milestone: the Dynamic user
 * id (always) plus the resolved email when present. Null until the user has
 * an id, so callers can defer firing until the user actually populates.
 */
export function resolveUserIdentity(
  user: DynamicIdentityUser | null | undefined,
): UserIdentity | null {
  if (!user?.id) return null;
  const email = resolveUserEmail(user);
  return {
    dynamicUserId: user.id,
    ...(email ? { email } : {}),
  };
}
