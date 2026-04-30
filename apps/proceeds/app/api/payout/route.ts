import { NextResponse } from "next/server";
import { createPayoutOrder } from "@/lib/fireblocks";
import { getServerUserData } from "@/lib/auth/server-auth";
import { payoutBodySchema } from "@/lib/validation/payout";

export async function POST(req: Request) {
  const user = await getServerUserData();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = payoutBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const result = await createPayoutOrder(parsed.data);

    return NextResponse.json({
      orderId: result.orderId,
      status: result.status,
      mock: result.mock,
    });
  } catch (err) {
    console.error("[payout] Error:", err);
    return NextResponse.json({ error: "Payout failed" }, { status: 500 });
  }
}
