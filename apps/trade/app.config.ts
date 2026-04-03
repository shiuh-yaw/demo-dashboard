import type { AppAuthConfig } from "@dynamic-demos/dynamic";

export const appConfig: AppAuthConfig = {
  auth: {
    emailOtp: true,
    socialProviders: ["google"],
    externalJwt: false,
  },
  kyc: "required",
  walletSelection: true,
  defaultReturnPath: "/portfolio",
  routePattern: "flat",
};
