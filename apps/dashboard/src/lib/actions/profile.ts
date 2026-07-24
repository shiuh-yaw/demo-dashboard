"use server";

/**
 * Profile self-service (Phase GTM-07). A signed-in user edits only their own
 * profile; `schedulingUrl` is validated https-only at the service layer
 * (InvalidSchedulingUrlError). No role required beyond a valid session.
 */

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth/gtm";
import { services, InvalidSchedulingUrlError } from "@/lib/services";
import type { GtmUser } from "@/lib/services";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface UpdateProfileInput {
  displayName?: string | null;
  avatarUrl?: string | null;
  schedulingUrl?: string | null;
}

/** Update the signed-in user's own profile. */
export async function updateProfile(
  input: UpdateProfileInput,
): Promise<ActionResult<GtmUser>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };

  const clean = (v: string | null | undefined) => {
    if (v == null) return v;
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed;
  };

  try {
    const updated = await services.users.update(user.id, {
      displayName: clean(input.displayName),
      avatarUrl: clean(input.avatarUrl),
      schedulingUrl: clean(input.schedulingUrl),
    });
    revalidatePath("/dashboard/profile");
    return { success: true, data: updated };
  } catch (err) {
    if (err instanceof InvalidSchedulingUrlError) {
      return { success: false, error: "Scheduling URL must be a valid https link" };
    }
    console.error("Failed to update profile:", err);
    return { success: false, error: "Failed to update profile" };
  }
}
