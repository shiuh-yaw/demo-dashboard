"use client";

import { useEffect } from "react";
import { initializeDynamicClient } from "@/lib/dynamic/client";

/**
 * Fire-and-forget Dynamic SDK init. Renders nothing — its only job is
 * to touch the lazy singleton on mount so the SDK starts initialising
 * as soon as the page loads, rather than waiting for the buyer to
 * click the widget CTA.
 *
 * Drop one of these near the top of any route that will eventually
 * hand control to a wallet/payment surface; subsequent imports of
 * `@/lib/dynamic/flow-sdk` see an already-initialised client.
 */
export function DynamicBootstrap() {
  useEffect(() => {
    initializeDynamicClient();
  }, []);
  return null;
}
