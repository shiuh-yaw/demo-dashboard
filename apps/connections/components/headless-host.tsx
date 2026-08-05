"use client";

import { useEffect } from "react";

import { startHeadlessEngine } from "@/lib/headless-engine";

/**
 * Boots the headless connect engine. Renders nothing - this is the no-UI page a
 * native host loads in a hidden WKWebView / Android WebView, or that the
 * `/headless-test` harness loads in a hidden iframe.
 */
export function HeadlessHost() {
  useEffect(() => {
    startHeadlessEngine();
  }, []);

  return null;
}
