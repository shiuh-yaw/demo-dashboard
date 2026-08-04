import type { TrackBatch } from "@dynamic-demos/analytics";
import type { RecordSightingInput } from "@/lib/services/types";

const AUTHENTICATED = "authenticated";
const EMAIL_MAX = 320;

export interface DetectLeadCtx {
  isInternal: boolean;
  prospectId: string | null;
}

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX || !email.includes("@")) return null;
  return email;
}

/** Extract a lead from an ingest batch, or null. Skips internal sessions and
 *  id-only (no-email) authenticated fires; a lead REQUIRES a valid email. */
export function detectLead(batch: TrackBatch, ctx: DetectLeadCtx): RecordSightingInput | null {
  if (ctx.isInternal) return null;
  for (const ev of batch.events) {
    if (ev.type !== "milestone" || ev.name !== AUTHENTICATED) continue;
    const props = (ev.props ?? {}) as Record<string, unknown>;
    const email = normalizeEmail(props.email);
    if (!email) continue;
    const dynamicUserId = typeof props.dynamicUserId === "string" ? props.dynamicUserId : null;
    return { email, dynamicUserId, demoSlug: batch.demoSlug, prospectId: ctx.prospectId };
  }
  return null;
}
