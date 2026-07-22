import type { AppAuthConfig } from "@dynamic-demos/dynamic";

export const appConfig: AppAuthConfig = {
  auth: {
    emailOtp: true,
    socialProviders: ["google"],
    externalJwt: true,
  },
  kyc: "required",
  walletSelection: false,
  defaultReturnPath: "/overview",
  routePattern: "flat",
};
