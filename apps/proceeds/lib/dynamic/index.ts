export { getClient } from "./client";
export { isSignedIn, logout } from "./auth";
export { isEmailAuthEnabled, sendEmailOTP, verifyOTP } from "./auth-email";
export { getAuthToken, getUserName } from "./auth-token";
export { getInitStatus, waitForClientInitialized } from "./init";
export { onEvent, offEvent } from "./events";
export {
  getWalletAccounts,
  getPrimaryWalletAccount,
  getEvmWalletAccount,
  getEvmWalletAccountsForAddress,
  getSmartWalletAccount,
  isEvmWalletAccount,
  createWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts,
} from "./wallets";
export {
  ensureZeroDev,
  sendUserOperation,
  createKernelClientForWalletAccount,
  signEip7702Authorization,
} from "./zerodev";
export {
  getNetworksData,
  getActiveNetworkData,
  switchActiveNetwork,
} from "./networks";
export { getTokenBalances, type TokenBalanceInfo } from "./balance";
export {
  registerPasskey,
  signInWithPasskey,
  getPasskeys,
  hasRegisteredPasskeys,
  confirmWithPasskeyMFA,
  getMfaSettings,
  isUserMissingMfaAuth,
  getMfaMethods,
  completeSessionMfa,
} from "./mfa";
export { getProceedsMetadata, getWalletMeta, updateWalletMeta } from "./metadata";

export type { WalletAccount, EvmWalletAccount } from "./wallets";
export type { InitStatus } from "./init";
export type { ProceedsMetadata, WalletMeta } from "./metadata";
export type { OTPVerification } from "@dynamic-labs-sdk/client";
