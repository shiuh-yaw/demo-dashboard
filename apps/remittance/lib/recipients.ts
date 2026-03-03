/**
 * Recipient parsing from user metadata.
 * Shared between server auth (initial data) and API handlers.
 */

import { KNOWN_RECIPIENTS_METADATA_KEY } from "@/lib/dynamic-api";

export type RecipientEntry = {
  email: string;
  address?: string;
  /** Display name (optional, for stub/UI). */
  name?: string;
  /** Avatar URL (optional, for stub/UI). */
  avatarUrl?: string;
};

export function getKnownRecipientsFromUser(
  user: { metadata?: Record<string, unknown> } | null,
): RecipientEntry[] {
  const raw = user?.metadata?.[KNOWN_RECIPIENTS_METADATA_KEY];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v): RecipientEntry | null => {
      if (typeof v === "string" && v.length > 0) {
        return { email: v, address: undefined };
      }
      if (
        typeof v === "object" &&
        v !== null &&
        "email" in v &&
        typeof (v as { email: unknown }).email === "string"
      ) {
        const obj = v as {
          email: string;
          address?: string;
          name?: string;
          avatarUrl?: string;
        };
        return {
          email: obj.email,
          address: typeof obj.address === "string" ? obj.address : undefined,
          name: typeof obj.name === "string" ? obj.name : undefined,
          avatarUrl:
            typeof obj.avatarUrl === "string" ? obj.avatarUrl : undefined,
        };
      }
      return null;
    })
    .filter((v): v is RecipientEntry => v !== null);
}

/**
 * Derive a display name from email when name is not set.
 * e.g. "john.doe@example.com" -> "John Doe"
 */
export function getRecipientDisplayName(entry: RecipientEntry): string {
  if (entry.name && entry.name.trim()) return entry.name.trim();
  const local = entry.email.split("@")[0];
  if (!local) return entry.email;
  return local.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get initials for avatar placeholder.
 * e.g. "John Doe" -> "JD", "john.doe@example.com" -> "JD"
 */
export function getRecipientInitials(entry: RecipientEntry): string {
  const name = getRecipientDisplayName(entry);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "";
    const last = parts[parts.length - 1]?.[0] ?? "";
    return (first + last).toUpperCase().slice(0, 2);
  }
  if (name.length >= 2) {
    return name.slice(0, 2).toUpperCase();
  }
  return name.slice(0, 1).toUpperCase() || "?";
}
