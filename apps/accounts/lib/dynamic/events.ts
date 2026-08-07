"use client";

/**
 * SDK events - reactive updates for auth and wallet state.
 *
 * @see https://dynamic.xyz/docs/javascript/reference/client/on-event
 */

import {
  onEvent as sdkOnEvent,
  offEvent as sdkOffEvent,
} from "@dynamic-labs-sdk/client";

export const onEvent = sdkOnEvent;
export const offEvent = sdkOffEvent;
