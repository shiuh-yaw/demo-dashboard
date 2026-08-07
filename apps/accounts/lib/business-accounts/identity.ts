/**
 * Building a `TargetIdentity` - the one input shape shared by "add a member"
 * and "add a signer".
 *
 * Pure: no SDK client, no React. The forms bind straight to `IdentityInput`
 * and hand the result to the SDK, so the branchy part (which extra field each
 * identifier type needs) is unit-testable.
 */

import type { TargetIdentity } from "@/lib/dynamic";

/**
 * How the target user is named.
 *
 * `userId` is not an SDK `identifierType`: it selects the alternative branch
 * of `TargetIdentity` (a known Dynamic user id) rather than a lookup key.
 * Every other value maps 1:1 to `BusinessAccountSignerIdentifierType`.
 */
export const IDENTIFY_BY = [
  "email",
  "phoneNumber",
  "externalUserId",
  "socialUsername",
  "socialAccountId",
  "userId",
] as const;

export type IdentifyBy = (typeof IDENTIFY_BY)[number];

export const IDENTIFY_BY_LABELS: Record<IdentifyBy, string> = {
  email: "Email",
  phoneNumber: "Phone number",
  externalUserId: "External user ID",
  socialUsername: "Social username",
  socialAccountId: "Social account ID",
  userId: "Dynamic user ID",
};

export const IDENTIFY_BY_PLACEHOLDERS: Record<IdentifyBy, string> = {
  email: "teammate@example.com",
  phoneNumber: "+15550100",
  externalUserId: "External user ID",
  socialUsername: "Social username",
  socialAccountId: "Social account ID",
  userId: "Dynamic user ID",
};

export interface IdentityInput {
  identifyBy: IdentifyBy;
  /** The identifier value, or the user id when `identifyBy` is `userId`. */
  value: string;
  /** Required for `socialUsername` / `socialAccountId`. */
  socialProvider?: string;
  /** Both required for `phoneNumber`. */
  isoCountryCode?: string;
  phoneCountryCode?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The reason this input can't be submitted, or null when it can.
 *
 * Returning the message (rather than a boolean) keeps the form's disabled
 * state and its error copy derived from one source.
 */
export function identityInputError(input: IdentityInput): string | null {
  const value = input.value.trim();
  if (!value) {
    return input.identifyBy === "userId"
      ? "Enter a Dynamic user ID."
      : "Enter an identifier.";
  }
  if (input.identifyBy === "email" && !EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address.";
  }
  if (
    (input.identifyBy === "socialUsername" ||
      input.identifyBy === "socialAccountId") &&
    !input.socialProvider?.trim()
  ) {
    return "Pick a social provider.";
  }
  if (
    input.identifyBy === "phoneNumber" &&
    (!input.isoCountryCode?.trim() || !input.phoneCountryCode?.trim())
  ) {
    return "Enter both the ISO country code and the dial code.";
  }
  return null;
}

/**
 * Map validated input onto the SDK's `TargetIdentity`.
 *
 * Throws on invalid input rather than emitting a half-built identity - the SDK
 * would reject it anyway, with a less specific message.
 */
export function buildTargetIdentity(input: IdentityInput): TargetIdentity {
  const error = identityInputError(input);
  if (error) throw new Error(error);

  const value = input.value.trim();

  if (input.identifyBy === "userId") return { userId: value };

  if (
    input.identifyBy === "socialUsername" ||
    input.identifyBy === "socialAccountId"
  ) {
    return {
      identifier: value,
      identifierType: input.identifyBy,
      // The SDK narrows this to its ProviderEnum union; the form offers only
      // providers the environment enabled, so the value is always one of them.
      socialProvider: input.socialProvider!.trim() as TargetIdentity["socialProvider"],
    };
  }

  if (input.identifyBy === "phoneNumber") {
    return {
      identifier: value,
      identifierType: "phoneNumber",
      smsCountryCode: {
        isoCountryCode: input.isoCountryCode!.trim(),
        phoneCountryCode: input.phoneCountryCode!.trim(),
      },
    };
  }

  return { identifier: value, identifierType: input.identifyBy };
}

/** A blank input, for resetting a form between opens. */
export function emptyIdentityInput(
  identifyBy: IdentifyBy = "email",
): IdentityInput {
  return { identifyBy, value: "" };
}
