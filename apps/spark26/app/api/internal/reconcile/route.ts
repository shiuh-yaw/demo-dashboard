import { NextResponse } from "next/server";
import {
  listStaleActiveOrders,
  readByConfirmation,
  transition,
} from "@/lib/store/order-store";
import { getOrderByNumber } from "@/lib/cvent/orders";
import { enqueueCventPostback } from "@/lib/upstash/qstash";
import { env } from "@/lib/env";
import { timingSafeEqualStrings } from "@/lib/auth-compare";

export const dynamic = "force-dynamic";

const MAX_CVENT_ATTEMPTS = 5;
const CHECKOUT_TTL_MS = 30 * 60 * 1000;       // 30 min
const TX_IN_FLIGHT_CEILING_MS = 30 * 60 * 1000; // 30 min

export async function GET(req: Request) {
  // Explicitly refuse when the secret isn't configured. Otherwise an
  // unset CRON_SECRET would collapse the check to `Bearer undefined`,
  // which an attacker could match by literally sending that header.
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (!timingSafeEqualStrings(auth, `Bearer ${env.CRON_SECRET}`)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const stale = await listStaleActiveOrders(2 * 60 * 1000);
  const actions: string[] = [];
  const host = req.headers.get("host") ?? "localhost:4010";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const appBaseUrl = `${protocol}://${host}`;

  for (const confirmation of stale) {
    const order = await readByConfirmation(confirmation);
    if (!order) continue;
    const now = Date.now();

    const cvent = await getOrderByNumber(confirmation).catch(() => null);
    if (cvent?.cancelled) {
      await transition(confirmation, [order.status], "cancelled", {}).catch(() => undefined);
      actions.push(`${confirmation}: cancelled`);
      continue;
    }

    if (
      order.status === "checkout_ready" &&
      now - Date.parse(order.updatedAt) > CHECKOUT_TTL_MS
    ) {
      await transition(confirmation, ["checkout_ready"], "checkout_expired", {}).catch(() => undefined);
      actions.push(`${confirmation}: checkout_expired`);
      continue;
    }

    if (
      order.status === "tx_in_flight" &&
      now - Date.parse(order.updatedAt) > TX_IN_FLIGHT_CEILING_MS
    ) {
      await transition(confirmation, ["tx_in_flight"], "tx_failed", {}).catch(() => undefined);
      actions.push(`${confirmation}: tx_failed (stale tx_in_flight)`);
      continue;
    }

    if (order.status === "tx_confirmed") {
      if ((order.cventPostAttempts ?? 0) < MAX_CVENT_ATTEMPTS) {
        await enqueueCventPostback(appBaseUrl, confirmation);
        actions.push(`${confirmation}: re-enqueued worker`);
      } else {
        console.error(
          `[spark26] reconcile: ${confirmation} stuck in tx_confirmed after ${order.cventPostAttempts} attempts: ${order.cventPostLastError}`
        );
        actions.push(`${confirmation}: STUCK (ops alert)`);
      }
      continue;
    }
  }

  return NextResponse.json({ scanned: stale.length, actions });
}
