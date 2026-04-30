import { NextResponse } from "next/server";
import { fetchPendingPayouts } from "@/lib/fireblocks-pending";
import { getServerUserData } from "@/lib/auth/server-auth";

export async function GET(request: Request) {
  const user = await getServerUserData();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  try {
    const result = await fetchPendingPayouts(address);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[payout/pending] Error:", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
