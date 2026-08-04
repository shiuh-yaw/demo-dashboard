/**
 * @dynamic-demos/analytics
 *
 * Public surface only. Everything else (queue, cookies, context fetch) is
 * internal implementation - do not import from outside the package.
 */

export { GtmTracker } from "./tracker";
export { useTrack } from "./use-track";
export type { UseTrackResult } from "./use-track";
export { BookACallCta } from "./cta";
export { getShareContext } from "./context";
export { trackBatchSchema, trackEventSchema, identitySchema } from "./schema";
export type { TrackBatch, TrackEvent, TrackIdentity } from "./schema";
export { resolveUserEmail, resolveUserIdentity } from "./identity";
export type { DynamicIdentityUser, UserIdentity } from "./identity";
export {
  useIdentify,
  useAuthenticatedMilestone,
} from "./use-authenticated-milestone";
export { AuthenticatedMilestone } from "./authenticated-milestone";
export type { AuthenticatedMilestoneProps } from "./authenticated-milestone";
