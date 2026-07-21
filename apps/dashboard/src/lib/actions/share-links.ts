"use server";

/**
 * Share-link mint + revoke (Phase GTM-05). Server actions only - the minimal
 * "Copy share link" popover on the existing per-kind demo lists is the only
 * consumer; the full Demos-table UI is Phase 07.
 *
 * Mint coherence rule (Phase 03.5, GTM-D-003): a DemoConfig bound to
 * prospect A (`prospectId` set) mints only for A - a mint request naming a
 * different prospect is rejected. An unbound config (`prospectId` null)
 * mints for any prospect; the link's own prospect supplies the theme at
 * redirect time (see `lib/share-links/resolve-redirect.ts`).
 *
 * Deviates from the literal phase-file wording (`requireUser()`, which
 * redirects): every sibling action file (`teams.ts`, `users.ts`,
 * `prospects.ts`) uses `getSessionUser()` + an `ActionResult` so a popover
 * can render an inline error instead of navigating away. Same fail-closed
 * behavior either way.
 */

import { getSessionUser } from "@/lib/auth/gtm";
import { canAccessOperations, canMintShareLinks } from "@/lib/auth/policy";
import { getRequestOrigin } from "@/lib/request-origin";
import { services } from "@/lib/services";
import {
  DemoConfigNotFoundError,
  ShareLinkProspectNotFoundError,
} from "@/lib/services/types";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface MintShareLinkRequest {
  demoConfigId: string;
  prospectId: string;
}

/** Mint a share link. Requires MEMBER+ (`canMintShareLinks`); VIEWER is read-only. */
export async function mintShareLink(
  input: MintShareLinkRequest,
): Promise<ActionResult<{ url: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  if (!canMintShareLinks(user)) {
    return { success: false, error: "Access denied" };
  }

  const demoConfig = await services.demoConfigs.get(input.demoConfigId);
  if (!demoConfig) return { success: false, error: "Demo config not found" };

  // Mint coherence: a bound config mints only for its own prospect.
  if (
    demoConfig.prospectId != null &&
    demoConfig.prospectId !== input.prospectId
  ) {
    return {
      success: false,
      error: "This demo is bound to a different prospect",
    };
  }

  try {
    const link = await services.shareLinks.mint({
      demoConfigId: input.demoConfigId,
      prospectId: input.prospectId,
      userId: user.id,
    });
    const origin = await getRequestOrigin();
    return { success: true, data: { url: `${origin}/s/${link.token}` } };
  } catch (err) {
    if (
      err instanceof DemoConfigNotFoundError ||
      err instanceof ShareLinkProspectNotFoundError
    ) {
      return { success: false, error: err.message };
    }
    console.error("Failed to mint share link:", err);
    return { success: false, error: "Failed to mint share link" };
  }
}

/** Revoke a share link. Owner (minting SE) or operator (ADMIN+) only. */
export async function revokeShareLink(
  id: string,
): Promise<ActionResult<{ revoked: true }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };

  const link = await services.shareLinks.get(id);
  if (!link) return { success: false, error: "Share link not found" };

  const isOwner = link.userId === user.id;
  if (!isOwner && !canAccessOperations(user)) {
    return { success: false, error: "Access denied" };
  }

  try {
    await services.shareLinks.revoke(id);
    return { success: true, data: { revoked: true } };
  } catch (err) {
    console.error("Failed to revoke share link:", err);
    return { success: false, error: "Failed to revoke share link" };
  }
}
