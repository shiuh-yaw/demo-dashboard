import type { Metadata } from "next";

import { HeadlessTest } from "@/components/headless-test";

export const metadata: Metadata = {
  title: "Headless engine - test harness",
  robots: { index: false, follow: false },
};

/**
 * Desktop stand-in for the native host: embeds `/headless` in a hidden iframe
 * and drives it through the same `window.headlessConnect.*` API iOS and Android use,
 * so the engine is verifiable in a browser before touching Swift or Kotlin.
 */
export default function Page() {
  return <HeadlessTest />;
}
