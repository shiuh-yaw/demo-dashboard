export { getClient } from "./client";
export {
  isSignedIn,
  logout,
  isEmailAuthEnabled,
  getEnabledSocialProviders,
  sendEmailOTP,
  verifyOTP,
  authenticateWithSocial,
  detectOAuthRedirect,
  completeSocialAuthentication,
  getUser,
  type OTPVerification,
  type SocialProvider,
  type UserLike,
} from "./auth";
export {
  getWalletAccounts,
  ensureEvmWaasWallet,
  getEmbeddedEvmWallet,
  getZerodevWalletFor,
  getExternalWallet,
  getExternalWalletOptions,
  linkExternalWallet,
  isEvmWalletAccount,
  type ExternalWalletOption,
  type WalletAccount,
  type EvmWalletAccount,
} from "./wallets";
export { getSepoliaNetwork, isNetworkSponsored, switchToSepolia, type NetworkData } from "./networks";
export { readBalances, sendUsdc, publicClient, getSponsorshipDiagnostics, type SponsorshipDiagnostics } from "./evm";
export { onEvent, getInitStatus, waitForClientInitialized, type InitStatus } from "./events";
export { wipeSdkStorage } from "./storage";
