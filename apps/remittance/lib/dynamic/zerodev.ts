"use client";

import {
  createKernelClientForWalletAccount as sdkCreateKernelClientForWalletAccount,
  isGasSponsorshipError as sdkIsGasSponsorshipError,
  canSponsorUserOperation as sdkCanSponsorUserOperation,
} from "@dynamic-labs-sdk/zerodev";

export const createKernelClientForWalletAccount =
  sdkCreateKernelClientForWalletAccount;

export const isGasSponsorshipError = sdkIsGasSponsorshipError;

export const canSponsorUserOperation = sdkCanSponsorUserOperation;
