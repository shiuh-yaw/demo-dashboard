/**
 * POST /api/kyc-deposit/reset
 *
 * Clears KYC completion for the authenticated Dynamic user (sets
 * `is_kyc_completed` back to false in their Dynamic user metadata) so the
 * SumSub gate runs again on the next deposit. Demo-only convenience for
 * re-running the flow multiple times.
 *
 * User state lives in Dynamic metadata (CLAUDE.md rule #2); this app holds
 * Dynamic credentials directly (rule #3). Requires DYNAMIC_API_KEY (a token
 * with user-write scope) + NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID.
 */

import { NextResponse, type NextRequest } from "next/server";
import { clearKycCompleted, getAuthenticatedUser } from "@dynamic-demos/dynamic";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  const payload = await getAuthenticatedUser(
    request,
    env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
  );
  const userId = payload?.sub;
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    await clearKycCompleted(userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to reset KYC status" },
      { status: 502 },
    );
  }
}
