/**
 * App auth configuration schema.
 * Used by apps to configure auth flow, KYC, wallet selection, and redirects.
 */

export interface AppAuthConfig {
  /** Auth methods: email OTP, social, JWT */
  auth: {
    emailOtp: boolean;
    socialProviders: string[];
    externalJwt: boolean;
  };
  /** KYC: none | required (single canonical flow) */
  kyc: "none" | "required";
  /** Optional wallet selection screen before main app */
  walletSelection: boolean;
  /** Default path after auth (e.g. /portfolio, /r/[id]/dashboard) */
  defaultReturnPath: string;
  /** Route pattern: flat | config-based (e.g. /r/[id]/*) */
  routePattern: "flat" | "config";
  /** Config param name when config-based (e.g. "id" for /r/[id]) */
  configParam?: string;
}
