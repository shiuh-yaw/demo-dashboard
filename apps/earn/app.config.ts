import type { AppAuthConfig } from "@dynamic-demos/dynamic";

export const appConfig: AppAuthConfig = {
  auth: {
    emailOtp: true,
    socialProviders: ["google"],
    externalJwt: true,
  },
  kyc: "none",
  walletSelection: false,
  defaultReturnPath: "/e/[id]/earn",
  routePattern: "config",
  configParam: "id",
};
