import type { TrackBatch } from "@dynamic-demos/analytics";
import { services } from "@/lib/services";
import { detectLead, type DetectLeadCtx } from "./detect";
import { notifyNewContact } from "./notifier";

export type HandleLeadCtx = DetectLeadCtx;

/** Ingest-time lead pipeline: detect -> record -> notify once. Fully fail-silent. */
export async function handleLead(batch: TrackBatch, ctx: HandleLeadCtx): Promise<void> {
  try {
    const input = detectLead(batch, ctx);
    if (!input) return;
    const { contact, shouldNotify, appearance } = await services.contacts.recordSighting(input);
    if (shouldNotify) await notifyNewContact(contact, appearance);
  } catch {
    // fail-silent - never affect ingest
  }
}
