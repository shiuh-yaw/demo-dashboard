/**
 * Wire schema for the GTM tracker.
 *
 * Single Zod source of truth shared by `packages/analytics` (client) and the
 * dashboard ingest endpoint (Phase 06, `POST /api/events`). Copied verbatim
 * from `docs/projects/gtm-platform/PLAN.md`'s "Shared contracts" section -
 * that document is binding; if this file must deviate, update PLAN.md in the
 * same PR.
 */

import { z } from "zod";

/** JSON.stringify(props).length must stay under this - enforced client + server. */
export const MAX_PROPS_SERIALIZED_LENGTH = 2048;

export const trackEventSchema = z.object({
  eventId: z.string().uuid(),
  type: z.enum(["pageview", "step", "milestone", "identify"]),
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

/**
 * Session-level identity, set via `useTrack().identify(userId, traits?)` and
 * carried on every batch from then on (last-wins across `identify` calls -
 * see `EventQueue.setIdentity`). Additive/optional - a batch without it must
 * still validate.
 */
export const identitySchema = z.object({
  userId: z.string().min(1).max(128),
  email: z.string().max(320).optional(),
  traits: z.record(z.unknown()).optional(),
});

export type TrackIdentity = z.infer<typeof identitySchema>;

export const trackBatchSchema = z.object({
  sessionId: z.string().uuid(),
  anonId: z.string().uuid(),
  demoSlug: z.string().min(1).max(64),
  shareToken: z.string().max(64).optional(),
  isInternal: z.boolean().optional(),
  identity: identitySchema.optional(),
  events: z.array(trackEventSchema).min(1).max(50),
});

export type TrackBatch = z.infer<typeof trackBatchSchema>;
