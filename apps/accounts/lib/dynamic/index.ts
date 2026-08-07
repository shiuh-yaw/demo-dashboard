/**
 * Dynamic SDK - barrel export.
 *
 * Each file under `lib/dynamic/` is a self-contained reference for one SDK
 * capability, so a reader can open the one that matches the panel step they
 * are looking at.
 */

// Client
export { getClient } from "./client";

// Auth
export {
  getAuthenticatedIdentity,
  getCurrentUserId,
  isSignedIn,
  logout,
  refreshAuth,
} from "./auth";
export type { AuthenticatedIdentity } from "./auth";
export { isEmailAuthEnabled, sendEmailOTP, verifyOTP } from "./auth-email";
export {
  authenticateWithSocial,
  completeSocialAuthentication,
  detectOAuthRedirect,
  getEnabledSocialProviders,
  isSocialAuthEnabled,
} from "./auth-social";

// Step-up (elevated access tokens)
export {
  additionalScopesFor,
  authenticatePasskey,
  authenticateTotp,
  BUSINESS_ACCOUNT_SCOPES,
  BUSINESS_ACCOUNT_SESSION_SCOPES,
  checkStepUpAuth,
  TokenScope,
} from "./step-up";
export type { StepUpCheck, StepUpCredentialOption } from "./step-up";

// Business accounts
export {
  addBusinessAccountMember,
  addBusinessAccountSigner,
  addWalletToBusinessAccount,
  createBusinessAccount,
  createWalletForBusinessAccount,
  getBusinessAccount,
  listBusinessAccounts,
  removeBusinessAccountMember,
  removeBusinessAccountSigner,
  removeBusinessAccountWallet,
  transferBusinessAccountOwnership,
  updateBusinessAccount,
  updateBusinessAccountMemberRole,
} from "./business-accounts";
export type {
  AssignableRole,
  BusinessAccount,
  BusinessAccountDetail,
  BusinessAccountList,
  BusinessAccountMember,
  BusinessAccountSigner,
  BusinessAccountWalletSummary,
  TargetIdentity,
} from "./business-accounts";

// Networks
export {
  getActiveNetworkData,
  getNetworksData,
  switchActiveNetwork,
} from "./networks";
export type { NetworkData } from "./networks";

// Wallets this session can sign with
export {
  findSignableWallet,
  getWalletAccounts,
  signableWalletsFor,
} from "./wallet-accounts";
export type { WalletAccount } from "./wallet-accounts";

// Holdings
export { getNativeBalance, getTokenBalances } from "./balance";
export type { TokenBalance } from "./balance";

// Activity
export { getTransactionHistory } from "./transaction-history";
export type {
  GetTransactionHistoryParams,
  GetTransactionHistoryResponse,
} from "./transaction-history";

// Sending
export { transferAmount } from "./transfer";
export { signMessage } from "./sign-message";
export { canSponsorTransfer, sendSponsoredTransfer } from "./gasless";
export type { SendStage } from "./gasless";
export {
  canSponsorSolanaTransfer,
  sendSponsoredSolanaTransfer,
} from "./gasless-solana";
export type { TransferParams } from "./transfer";

// Events
export { offEvent, onEvent } from "./events";

// Initialization
export { getInitStatus, waitForClientInitialized } from "./init";
export type { InitStatus } from "./init";

// Types
export type { Chain, OTPVerification } from "@dynamic-labs-sdk/client";
