import { CventSDK } from "@cvent/sdk";
import { env } from "@/lib/env";

// Pin the SDK on globalThis so HMR re-evaluating this module in `next dev`
// doesn't wipe the SDK's internal OAuth cache. The cache is the only thing
// between us and Cvent's strict token-endpoint rate limit — every HMR that
// reset `let singleton` meant a fresh token mint, and at dev tempo that
// trips 429s fast. Prod uses the same code path but the singleton survives
// naturally because Node doesn't re-evaluate modules mid-process.
declare global {
  var __spark26CventSdk: CventSDK | undefined;
}

// Cvent's REST API lives under the /ea prefix (Enterprise API surface).
// CVENT_BASE_URL holds only the host so the same value can address other
// Cvent surfaces on the same origin. Using new URL("/ea", base) keeps this
// idempotent if someone sets the env with /ea already appended.
function eaServerURL(): string {
  return new URL("/ea", env.CVENT_BASE_URL).toString();
}

export function cventSdk(): CventSDK {
  if (globalThis.__spark26CventSdk) return globalThis.__spark26CventSdk;
  globalThis.__spark26CventSdk = new CventSDK({
    serverURL: eaServerURL(),
    security: {
      oAuth2ClientCredentials: {
        clientID: env.CVENT_CLIENT_ID,
        clientSecret: env.CVENT_CLIENT_SECRET,
      },
    },
  });
  return globalThis.__spark26CventSdk;
}
