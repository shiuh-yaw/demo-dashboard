"use client";

/**
 * The signed-in user's Dynamic user id - the key every authorization question
 * in `lib/business-accounts/view.ts` is answered against.
 */

import { useAuthenticatedIdentity } from "@/hooks/use-authenticated-identity";

export function useCurrentUserId(): string | null {
  return useAuthenticatedIdentity()?.dynamicUserId ?? null;
}
