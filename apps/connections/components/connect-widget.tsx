"use client";

import { DynamicProvider } from "@dynamic-labs-sdk/react-hooks";

import { getClient } from "@/lib/dynamic-client";
import { ConnectFlow } from "./connect-flow";
import { ConnectSkeletonCard } from "./connect-skeleton";

/**
 * Mounts the Dynamic react-hooks provider directly above the flow.
 *
 * This module is only ever loaded in the browser (it sits behind the
 * `ssr: false` boundary in connect-flow-lazy.tsx), so `getClient()` returns a
 * real client on the very first render and the provider is present from the
 * start. That keeps the tree shape constant, which is the point: mounting the
 * provider at the root instead meant it appeared only after hydration, changing
 * the element type above the flow and forcing a full remount.
 */
export function ConnectWidget() {
  const client = getClient();

  // Unreachable in practice - the singleton only returns null on the server and
  // this component never renders there. Rendering the skeleton rather than
  // throwing keeps a surprise here from blanking an integrator's iframe.
  if (!client) return <ConnectSkeletonCard />;

  return (
    <DynamicProvider client={client}>
      <ConnectFlow />
    </DynamicProvider>
  );
}
