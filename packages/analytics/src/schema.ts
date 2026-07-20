/**
 * Wire schema for the GTM tracker.
 *
 * Single Zod source of truth shared by `packages/analytics` (client) and the
 * dashboard ingest endpoint (Phase 06, `POST /api/track`). Copied verbatim
 * from `docs/projects/gtm-platform/PLAN.md`'s "Shared contracts" section -
 * that document is binding; if this file must deviate, update PLAN.md in the
 * same PR.
 */

import { z } from "zod";

/** JSON.stringify(props).length must stay under this - enforced client + server. */
export const MAX_PROPS_SERIALIZED_LENGTH = 2048;

export const trackEventSchema = z.object({
  eventId: z.string().uuid(),
  type: z.enum(["pageview", "step", "milestone"]),
  name: z.string().min(1).max(128),
  path: z.string().max(512).optional(),
  ts: z.number().int().positive(), // epoch ms, client clock
  props: z
    .record(z.unknown())
    .optional()
    .refine(
      (props) =>
        props === undefined ||
        JSON.stringify(props).length <= MAX_PROPS_SERIALIZED_LENGTH,
      {
        message: `props must serialize to at most ${MAX_PROPS_SERIALIZED_LENGTH} characters`,
      },
    ),
});

export type TrackEvent = z.infer<typeof trackEventSchema>;

export const trackBatchSchema = z.object({
  sessionId: z.string().uuid(),
  anonId: z.string().uuid(),
  demoSlug: z.string().min(1).max(64),
  shareToken: z.string().max(64).optional(),
  isInternal: z.boolean().optional(),
  events: z.array(trackEventSchema).min(1).max(50),
});

export type TrackBatch = z.infer<typeof trackBatchSchema>;
