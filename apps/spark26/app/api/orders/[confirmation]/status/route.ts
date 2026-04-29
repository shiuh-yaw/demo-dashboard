import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveOrderState } from "@/lib/resolve-order-state";
import { confirmationLimiter, ipLimiter } from "@/lib/upstash/ratelimit";

const confirmationSchema = z.string().regex(/^[A-Za-z0-9]{1,32}$/);

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ confirmation: string }> }
) {
  const { confirmation } = await params;
  const parsed = confirmationSchema.safeParse(confirmation);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "malformed confirmation" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  const [byConfirmation, byIp] = await Promise.all([
    confirmationLimiter().limit(parsed.data),
    ipLimiter().limit(ip),
  ]);
  if (!byConfirmation.success || !byIp.success) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  const result = await resolveOrderState(parsed.data);

  switch (result.kind) {
    case "not_found":
      return NextResponse.json(
        { status: "not_found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    default: {
      const { order } = result;
      return NextResponse.json(
        {
          status: order.status,
          amountDue: order.amountDue,
          currency: order.currency,
          attendeeName: order.attendeeName,
          updatedAt: order.updatedAt,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
  }
}
