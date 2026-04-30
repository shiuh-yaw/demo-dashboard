import type { AppAuthConfig } from "@dynamic-demos/dynamic";

export const appConfig: AppAuthConfig = {
  auth: {
    emailOtp: true,
    socialProviders: [],
    externalJwt: false,
  },
  kyc: "none",
  walletSelection: false,
  defaultReturnPath: "/payment-methods",
  routePattern: "flat",
};
