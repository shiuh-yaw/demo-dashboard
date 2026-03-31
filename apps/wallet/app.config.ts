import type { AppAuthConfig } from "@dynamic-demos/dynamic";

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
