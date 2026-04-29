import {
  readByConfirmation,
  transition,
  upsertFromCvent,
} from "@/lib/store/order-store";
import { postOfflineCharge } from "@/lib/cvent/transactions";

export type PostbackResult =
  | { ok: true; skipped?: string }
  | { ok: false; retry: boolean; error: string };

// Single source of truth for the tx_confirmed → paid transition. Called by
// the QStash worker route (prod) and by qstash.ts's inline fallback (local
// dev / QStash unavailable). Never throws — errors are reported in the
// PostbackResult so callers can choose retry semantics.
export async function runCventPostback(
  confirmation: string
): Promise<PostbackResult> {
  const order = await readByConfirmation(confirmation);
  if (!order) return { ok: true, skipped: "not-found" };
  if (order.status !== "tx_confirmed") return { ok: true, skipped: order.status };

  if (!order.cventOrderId) {
    const err = "missing cventOrderId on stored order — cannot post offline charge";
    await upsertFromCvent(confirmation, {
      amountDue: order.amountDue,
      currency: order.currency,
      cventPostAttempts: (order.cventPostAttempts ?? 0) + 1,
      cventPostLastError: err,
    });
    console.error(`[spark26] Cvent postback FAIL ${confirmation}: ${err}`);
    return { ok: false, retry: false, error: err };
  }
  // Cvent's referenceNumber column has a length cap; a full 0x-prefixed
  // 66-char EVM tx hash exceeds it and yields a generic 500. Cap at 29 chars
  // — enough to include `0x` + 27 hex digits of the tx hash, which uniquely
  // identifies the settlement for reconciliation. Fall back to the
  // confirmation number if the tx hash is somehow missing (shouldn't happen
  // past tx_confirmed, but defensive).
  const REFERENCE_MAX = 29;
  const reference = (order.txHash ?? confirmation).slice(0, REFERENCE_MAX);
  try {
    const result = await postOfflineCharge({
      attendeeId: order.cventAttendeeId,
      orderId: order.cventOrderId,
      paidAt: new Date(),
      reference,
    });
    const cventTransactionId = (result as { id?: string }).id ?? "unknown";
    await transition(confirmation, ["tx_confirmed"], "paid", { cventTransactionId });
    console.info(
      `[spark26] Cvent postback success ${confirmation} cventTransactionId=${cventTransactionId}`,
    );
    return { ok: true };
  } catch (err) {
    const detail = formatCventError(err);
    const status = extractStatus(err);
    await upsertFromCvent(confirmation, {
      amountDue: order.amountDue,
      currency: order.currency,
      cventPostAttempts: (order.cventPostAttempts ?? 0) + 1,
      cventPostLastError: detail.slice(0, 500),
    });
    // Permanent 4xx (excluding 429) → don't retry.
    const permanent = status !== undefined && status >= 400 && status < 500 && status !== 429;
    console.error(
      `[spark26] Cvent postback FAIL ${confirmation} retry=${!permanent}: ${detail}`,
    );
    return { ok: false, retry: !permanent, error: detail };
  }
}

// The Cvent SDK throws `ResponseValidationError` with extra fields
// (statusCode, body, cause=ZodError) that don't make it into .message. Pull
// them out so the stored `cventPostLastError` actually tells us what broke.
function formatCventError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const e = err as Error & {
    statusCode?: number;
    body?: unknown;
    cause?: unknown;
  };
  const parts: string[] = [e.message];
  if (typeof e.statusCode === "number") parts.push(`status=${e.statusCode}`);
  if (typeof e.body === "string" && e.body.length > 0) {
    parts.push(`body=${e.body.slice(0, 200)}`);
  }
  if (e.cause instanceof Error) {
    const issues = (e.cause as Error & { issues?: unknown[] }).issues;
    if (Array.isArray(issues)) {
      parts.push(`zod=${JSON.stringify(issues).slice(0, 200)}`);
    } else {
      parts.push(`cause=${e.cause.message}`);
    }
  }
  return parts.join(" | ");
}

function extractStatus(err: unknown): number | undefined {
  if (!(err instanceof Error)) return undefined;
  const s = (err as Error & { statusCode?: number }).statusCode;
  if (typeof s === "number") return s;
  const match = /\b(\d{3})\b/.exec(err.message);
  if (!match) return undefined;
  const captured = match[1];
  return captured ? Number.parseInt(captured, 10) : undefined;
}
