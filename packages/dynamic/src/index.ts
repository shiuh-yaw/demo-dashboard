/**
 * @dynamic-demos/dynamic
 *
 * Single package for all Dynamic-related code (client + server).
 * - Client: ConnectedAuthScreen, useAuthForm
 * - Server: schema, metadata, JWT, redirect, middleware
 */

// Schema
export type { AppAuthConfig } from "./schema";

// Metadata
export {
  METADATA_KEYS,
  KYC_APPROVED_METADATA_KEY,
  isMetadataTruthy,
  isKycCompleted,
  getWalletType,
  getDepositFireblocksEntry,
  mergeDepositFireblocksNetwork,
  type DepositFireblocksNetworkEntry,
  type DepositFireblocksNetworkKey,
  getUser,
  getUserWallets,
  updateUserMetadata,
  setKycCompleted,
  clearKycCompleted,
  setWalletType,
  clearWalletType,
  removeMetadataKey,
  clearAllMetadata,
  type DynamicUser,
  type DynamicWallet,
  type FireblocksMetadata,
  type UserWithMetadata,
  type WalletType,
} from "./metadata";

// JWT
export {
  verifyDynamicJWT,
  getJWTFromRequest,
  getAuthenticatedUser,
  getJWTFromCookies,
  getAuthenticatedUserFromCookies,
  getUserIdFromPayload,
  type DynamicJwtPayload,
  type JwtVerifiedCredential,
} from "./jwt";

// Redirect
export { getSafeRedirectDest, buildLoginUrl } from "./redirect";

// Middleware
export { createAuthMiddleware, type MiddlewareConfig } from "./middleware";

// Client (must be imported separately for "use client" boundary)
export { ConnectedAuthScreen } from "./connected-auth-screen";
export { useAuthForm } from "./use-auth-form";
export type { ConnectedAuthScreenProps, DynamicAuthAdapter } from "./types";
