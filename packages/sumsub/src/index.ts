/**
 * @dynamic-demos/sumsub
 *
 * SumSub API client + webhook verifier + Iron token sharing helpers.
 * Sandbox-by-default (D-005).
 */

export {
  createSumsubClient,
  resolveSumsubBaseUrl,
  SumsubClient,
  SumsubApiError,
  type CreateSumsubClientOptions,
} from "./client";

export { signRequest, type SignedHeaders } from "./auth";

export type {
  AccessToken,
  Applicant,
  ApplicantAddress,
  ApplicantFixedInfo,
  ApplicantInfo,
  ApplicantReview,
  ApplicantReviewAnswer,
  ApplicantReviewResult,
  ApplicantReviewStatus,
  CreateApplicantRequest,
  GenerateAccessTokenRequest,
  GenerateShareTokenRequest,
  ISumsubClient,
  ReuseIdentityPreview,
  ReuseIdentityRequest,
  SumsubClientConfig,
  SumsubEnvironment,
  SumsubWebhookPayload,
  SumsubWebhookType,
} from "./types";

export {
  normalizeSumsubEvent,
  verifySumsubSignature,
  SUMSUB_DIGEST_HEADER,
  type CanonicalEvent,
} from "./webhooks";

export {
  buildIronTokenIdentification,
  requiresUserAction,
  type IronIntendedUse,
  type IronIdentificationStatus,
  type IronTokenIdentificationRequest,
  type IronTokenIdentificationResponse,
} from "./iron";
