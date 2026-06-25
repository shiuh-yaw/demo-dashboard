/**
 * GET /api/kyc-deposit/kyc-status
 *
 * Reports whether the authenticated Dynamic user has already completed KYC,
 * read from their Dynamic user metadata (`is_kyc_completed`). Lets the
 * client skip the SumSub gate for returning, already-verified users.
 *
 * User state lives in Dynamic metadata (CLAUDE.md rule #2); this app holds
 * Dynamic credentials directly (rule #3), so it reads via @dynamic-demos/dynamic.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  getAuthenticatedUser,
  getUser,
  isKycCompleted,
} from "@dynamic-demos/dynamic";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
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
    const user = await getUser(userId);
    return NextResponse.json({
      completed: user ? isKycCompleted(user) : false,
    });
  } catch {
    // Don't block verification if the metadata lookup fails (e.g. admin token
    // not configured) — report not-completed so the SumSub gate still runs.
    return NextResponse.json({ completed: false });
  }
}
