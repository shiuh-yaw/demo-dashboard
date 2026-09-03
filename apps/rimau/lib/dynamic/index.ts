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
  isEvmWalletAccount,
  type WalletAccount,
  type EvmWalletAccount,
} from "./wallets";
export { getSepoliaNetwork, isNetworkSponsored, switchToSepolia, type NetworkData } from "./networks";
export { readBalances, sendUsdc, publicClient } from "./evm";
export { onEvent, getInitStatus, waitForClientInitialized, type InitStatus } from "./events";
export { wipeSdkStorage } from "./storage";
