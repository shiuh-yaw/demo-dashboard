/**
 * POST /api/kyc-deposit/settle
 *
 * Called after a user's USDC deposit transfer settles on-chain. Triggers the
 * merchant's Iron offramp in sandbox (money → merchant's bank), simulating the
 * deposit so it progresses to settled. Proxies the dashboard, which owns Iron
 * config + the fixed merchant customer (D-003).
 *
 * Dashboard route: POST /api/iron/sandbox/merchant-offramp
 */

import { NextResponse, type NextRequest } from "next/server";
import { dashboardPost } from "@/lib/dashboard-api";
import { extractDashboardAuth } from "@/lib/dashboard-auth";

interface SettleBody {
  amountUsdc: string;
  /** Depositor's wallet address — surfaced as "From" in the deposit feed. */
  fromAddress?: string;
}

export async function POST(request: NextRequest) {
  let body: SettleBody;
  try {
    body = (await request.json()) as SettleBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.amountUsdc) {
    return NextResponse.json(
      { error: "amountUsdc is required" },
      { status: 400 },
    );
  }

  const auth = extractDashboardAuth(request);
  const result = await dashboardPost<{ autorampId: string }>(
    "/api/iron/sandbox/merchant-offramp",
    { amountUsdc: body.amountUsdc, fromAddress: body.fromAddress },
    auth,
  );

  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error || "Failed to settle merchant offramp" },
      { status: 502 },
    );
  }

  return NextResponse.json(result.data);
}
