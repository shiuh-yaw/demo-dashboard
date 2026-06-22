/**
 * Iron-specific helpers for SumSub → Iron reliance KYC (token sharing).
 *
 * Flow:
 *   1. User completes KYC in SumSub (your SumSub account).
 *   2. Generate a share token via `SumsubClient.generateShareToken()`.
 *   3. Pass the share token to Iron's `POST /api/customers/{id}/identifications/v2`
 *      with `type: "Token"` — Iron consumes the SumSub data without re-verifying.
 *
 * This module provides type-safe helpers for step 3 (the Iron side).
 *
 * Reference: https://docs.iron.xyz/reliance-kyc-token-sharing
 */

/** Iron intended use values accepted by the identifications/v2 endpoint. */
export type IronIntendedUse =
  | "Investing"
  | "PaymentToFriendsFamilyorOthers"
  | "PurchaseDigitalAssets"
  | "OnlinePurchasesOfGoodsOrServices"
  | "Trading";

/** Iron identification status returned from the v2 endpoint. */
export type IronIdentificationStatus =
  | "Pending"
  | "Processed"
  | "Approved"
  | "Rejected";

/** Request body for Iron's token-based identification endpoint. */
export interface IronTokenIdentificationRequest {
  /** Always `"Token"` for SumSub share token flow. */
  type: "Token";
  /** The SumSub share token (single-use). */
  token: string;
  /** Purpose of the customer's use of the platform. */
  intended_use: IronIntendedUse;
  /** Customer's IP address (optional, improves risk scoring). */
  ip_address?: string;
}

/** Response from Iron's identification endpoint when using token sharing. */
export interface IronTokenIdentificationResponse {
  id: string;
  status: IronIdentificationStatus;
  /** If status is `Pending`, the customer must complete missing steps at this URL. */
  url?: string;
}

/**
 * Build the request body for Iron's token-based identification endpoint.
 *
 * Usage with the Iron client:
 * ```ts
 * const shareToken = await sumsubClient.generateShareToken({
 *   applicantId: "sumsub_applicant_id",
 * });
 * const body = buildIronTokenIdentification({
 *   token: shareToken.token,
 *   intended_use: "PurchaseDigitalAssets",
 * });
 * // Pass to: POST /api/customers/{ironCustomerId}/identifications/v2
 * const result = await ironClient.kyc.startWithToken({
 *   customer_id: ironCustomerId,
 *   ...body,
 * });
 * ```
 */
export function buildIronTokenIdentification(params: {
  token: string;
  intended_use: IronIntendedUse;
  ip_address?: string;
}): IronTokenIdentificationRequest {
  return {
    type: "Token",
    token: params.token,
    intended_use: params.intended_use,
    ...(params.ip_address ? { ip_address: params.ip_address } : {}),
  };
}

/**
 * Check whether an Iron identification response requires further user action.
 * Returns `true` if the user must visit the returned URL to complete KYC.
 */
export function requiresUserAction(
  response: IronTokenIdentificationResponse,
): boolean {
  return response.status === "Pending" && response.url != null && response.url !== "";
}
