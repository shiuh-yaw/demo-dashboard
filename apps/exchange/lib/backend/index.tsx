"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { DEMO_MODE } from "@/lib/mode";
import { StagedBackendProvider } from "./staged";
export { useBackend } from "./context";

/**
 * The live Dynamic SDK is only ever loaded in live mode: `next/dynamic` keeps
 * it out of the staged bundle entirely, so a stage laptop never fetches it.
 */
const LiveBackendProvider = dynamic(() => import("./live").then((m) => m.LiveBackendProvider), {
  ssr: false,
  loading: () => (
    <div className="min-h-dvh grid place-items-center text-sm text-muted">Loading wallet SDK</div>
  ),
});

export function BackendProvider({ children }: { children: ReactNode }) {
  if (DEMO_MODE === "live") return <LiveBackendProvider>{children}</LiveBackendProvider>;
  return <StagedBackendProvider>{children}</StagedBackendProvider>;
}
