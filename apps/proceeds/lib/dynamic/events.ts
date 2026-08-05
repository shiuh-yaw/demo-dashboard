"use client";

import {
  onEvent as sdkOnEvent,
  offEvent as sdkOffEvent,
} from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

// Force lazy Dynamic client creation before subscribing: the always-mounted
// IdentityBridge subscribes via useSyncExternalStore, whose `subscribe` can run
// before `getSnapshot` on hydration, and the raw SDK `onEvent` throws
// ClientNotFoundError when no client has been created yet.
export const onEvent: typeof sdkOnEvent = (params) => {
  if (typeof window !== "undefined") getClient();
  return sdkOnEvent(params);
};

export const offEvent = sdkOffEvent;
