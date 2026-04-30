import { NextRequest, NextResponse } from "next/server";
import { getOrderStatus } from "@/lib/fireblocks";
import { getServerUserData } from "@/lib/auth/server-auth";

export async function GET(req: NextRequest) {
  const user = await getServerUserData();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  try {
    const result = await getOrderStatus(orderId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[payout/status] Error:", err);
    return NextResponse.json(
      { error: "Status lookup failed" },
      { status: 500 },
    );
  }
}
