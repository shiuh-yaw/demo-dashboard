import type { Metadata } from "next";

import { ConnectFlowLazy } from "@/components/connect-flow-lazy";

export const metadata: Metadata = {
  title: "Log in with your wallet · Fireblocks",
  robots: { index: false, follow: false },
};

/**
 * The embed target. Chromeless and full-bleed by design - this is the URL an
 * integrator points an iframe or a native webview at, so there is deliberately
 * no site header, footer, or Book-a-call CTA to follow the widget into someone
 * else's page. The scenario front door at `/` wraps the same widget in our
 * shared chrome.
 */
export default function Page() {
  return <ConnectFlowLazy />;
}
