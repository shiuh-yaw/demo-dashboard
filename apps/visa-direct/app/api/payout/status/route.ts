import { type NextRequest, NextResponse } from "next/server";
import { getOrderStatus } from "@/lib/api/fireblocks";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("theme");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  try {
    const order = await getOrderStatus(id);
    return NextResponse.json({ success: true, ...order });
  } catch (err) {
    console.error("[GET /api/payout/status]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Status check failed",
      },
      { status: 500 },
    );
  }
}
