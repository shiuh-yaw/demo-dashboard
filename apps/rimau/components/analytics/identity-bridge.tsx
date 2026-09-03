"use client";

/**
 * Always-mounted identity bridge - fires the fleet-wide `authenticated`
 * milestone via `useIdentify` once the session has a person. The tracker is a
 * no-op without NEXT_PUBLIC_TRACK_URL, and in staged mode the identity is the
 * simulated account.
 */

import { useIdentify } from "@dynamic-demos/analytics";
import { useSession } from "@/lib/session/store";

export function IdentityBridge() {
  const { state } = useSession();
  useIdentify(
    state.person ? { id: state.person.userId, email: state.person.email || undefined } : null,
  );
  return null;
}
