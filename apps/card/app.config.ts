import type { AppAuthConfig } from "@dynamic-demos/dynamic";

// Client-side auth (JS SDK). Rain performs its own KYC via the apply form,
// so Dynamic KYC stays "none". Flat routes; unauthenticated users land on "/".
export const appConfig: AppAuthConfig = {
  auth: {
    emailOtp: true,
    socialProviders: [],
    externalJwt: true,
  },
  kyc: "none",
  walletSelection: false,
  defaultReturnPath: "/",
  routePattern: "flat",
};
