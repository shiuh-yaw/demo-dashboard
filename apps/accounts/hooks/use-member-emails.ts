"use client";

/**
 * Resolves a member or signer `userId` to a display name for the row.
 *
 * Prefers the signed-in user's own email (authoritative, from the session),
 * then the locally remembered invite addresses, then null - which leaves the
 * row to render the shortened id.
 *
 * Read in an effect rather than in a `useState` initializer so the first paint
 * matches what the server rendered.
 */

import { useEffect, useState } from "react";
import { useAuthenticatedIdentity } from "@/hooks/use-authenticated-identity";
import {
  readMemberEmails,
  type MemberEmails,
} from "@/lib/business-accounts/member-emails";

export function useMemberEmails(businessAccountId: string) {
  const identity = useAuthenticatedIdentity();
  const [directory, setDirectory] = useState<MemberEmails>({});

  useEffect(() => setDirectory(readMemberEmails()), [businessAccountId]);

  const known = directory[businessAccountId] ?? {};

  return (userId: string | null | undefined): string | null => {
    if (!userId) return null;
    if (userId === identity?.dynamicUserId) return identity.email ?? null;
    return known[userId] ?? null;
  };
}
