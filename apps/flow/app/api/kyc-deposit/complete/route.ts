/**
 * POST /api/kyc-deposit/complete
 *
 * Persists KYC completion for the authenticated Dynamic user by setting
 * `is_kyc_completed` in their Dynamic user metadata. Called by the client
 * once SumSub reports a GREEN review, so returning users skip re-verification.
 *
 * User state lives in Dynamic metadata (CLAUDE.md rule #2); this app holds
 * Dynamic credentials directly (rule #3). Requires DYNAMIC_API_KEY (a token
 * with user-write scope) + NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser, setKycCompleted } from "@dynamic-demos/dynamic";
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
    await setKycCompleted(userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Failed to persist KYC status",
      },
      { status: 502 },
    );
  }
}
