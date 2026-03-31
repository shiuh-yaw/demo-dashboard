"use client";

import {
  logout as sdkLogout,
  isSignedIn as sdkIsSignedIn,
} from "@dynamic-labs-sdk/client";
import { getClient, createSafeWrapper } from "./client";

export const isSignedIn = createSafeWrapper(sdkIsSignedIn, false);

export async function logout(): Promise<void> {
  const client = getClient();
  if (!client) return;
  return sdkLogout();
}
