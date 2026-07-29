/**
 * @dynamic-demos/analytics
 *
 * Public surface only. Everything else (queue, cookies, context fetch) is
 * internal implementation - do not import from outside the package.
 */

export { GtmTracker } from "./tracker";
export { useTrack } from "./use-track";
export { BookACallCta } from "./cta";
export { getShareContext } from "./context";
export { trackBatchSchema, trackEventSchema } from "./schema";
export type { TrackBatch } from "./schema";
export { resolveUserEmail, resolveUserIdentity } from "./identity";
export type { DynamicIdentityUser, UserIdentity } from "./identity";
