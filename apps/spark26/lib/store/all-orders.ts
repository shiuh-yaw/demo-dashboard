import { redis } from "./redis-client.js";
import type { OrderState } from "@/lib/types/order-state";

const SCAN_PATTERN = "spark26:order:*";
const SCAN_COUNT = 200;

// Admin-only. Returns every order record in Redis regardless of state.
// Uses SCAN in a loop to avoid blocking Redis on large keyspaces. At event
// scale (low thousands of orders) this is fine; we aren't paginating for
// the client — the admin dashboard renders the full list.
export async function listAllOrders(): Promise<OrderState[]> {
  const out: OrderState[] = [];
  let cursor = "0";
  do {
    const [next, keys] = await redis().scan(cursor, SCAN_PATTERN, SCAN_COUNT);
    cursor = next;
    if (keys.length === 0) continue;
    const values = await redis().mget(...keys);
    for (const raw of values) {
      if (!raw) continue;
      try {
        out.push(JSON.parse(raw) as OrderState);
      } catch {
        // Skip corrupt entries; admin can investigate via debug route.
      }
    }
  } while (cursor !== "0");
  return out;
}
