import type { Metadata } from "next";

import { HeadlessHost } from "@/components/headless-host";

export const metadata: Metadata = {
  title: "Fireblocks Connect - headless engine",
  robots: { index: false, follow: false },
};

/**
 * No UI. Runs the Dynamic SDK inside a hidden webview and talks to the native
 * host over a JS bridge. See lib/headless-engine.ts and lib/bridge.ts.
 */
export default function Page() {
  return <HeadlessHost />;
}
