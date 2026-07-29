/**
 * Rain card linkage, supplied by the calling app on the request.
 *
 * The dashboard does NOT own or resolve the card: the consuming app stores it
 * (Dynamic user metadata) and retrieves it client-side, then sends the two ids
 * the Rain calls need on each request. The dashboard only makes the Rain call.
 * This keeps the dashboard free of any per-app Dynamic environment / admin
 * token: it never reads user metadata.
 *
 * Trust note: these ids are client-supplied. For this sandbox demo that is an
 * accepted tradeoff. A production deployment MUST verify the card belongs to
 * the authenticated user (`withAuth` already verifies the JWT) before making
 * Rain calls on their behalf, to prevent one user reading another's card.
 */

import type { NextRequest } from "next/server";
import { ValidationError } from "@/lib/errors";

const CARD_ID_HEADER = "x-rain-card-id";
const USER_ID_HEADER = "x-rain-user-id";

/** The Rain identifiers the dashboard needs: card id (secrets) + Rain user id. */
export interface RequestRainCard {
  id: string;
  userId: string;
}

/**
 * Read the Rain card id + Rain user id from the request headers, or throw a
 * 400. Replaces the old admin-API metadata read (`getRainCardOr404`).
 */
export function getRainCardFromRequest(req: NextRequest): RequestRainCard {
  const id = req.headers.get(CARD_ID_HEADER)?.trim();
  const userId = req.headers.get(USER_ID_HEADER)?.trim();
  if (!id || !userId) {
    throw new ValidationError(
      `Missing ${CARD_ID_HEADER} / ${USER_ID_HEADER} headers`,
    );
  }
  return { id, userId };
}
