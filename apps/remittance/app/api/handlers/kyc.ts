/**
 * KYC API Handlers
 */

import {
  getUser,
  updateUserMetadata,
  KYC_APPROVED_METADATA_KEY,
} from "@/lib/dynamic-api";
import { isMetadataTruthy } from "@/lib/user-metadata";

export async function handleGetKycStatus(userId: string) {
  const user = await getUser(userId);
  const kycApproved = user
    ? isMetadataTruthy(user, KYC_APPROVED_METADATA_KEY)
    : false;
  return { kycApproved };
}

export async function handleApproveKyc(userId: string) {
  await updateUserMetadata(userId, {
    [KYC_APPROVED_METADATA_KEY]: "true",
  });
  return { success: true };
}
