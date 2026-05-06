"use client";

/**
 * Lightweight provider HOC that bundles the demo's auth wiring.
 *
 * Most apps already wrap their tree in a `Providers` component that hosts
 * a TanStack Query client. This HOC keeps that flexibility while encoding
 * the standard pattern: optional `<DynamicInit />` rendered alongside
 * children, with the rest of the tree (theme, contexts) layered by the
 * caller.
 *
 * Apps that need bespoke nesting (e.g. proceeds with `ActiveNetworkProviderHost`)
 * keep their own Providers; this HOC is opt-in.
 */

import { type ReactNode } from "react";
import { DynamicInit, type DynamicInitProps } from "./DynamicInit";

export interface DynamicAuthProviderProps {
  /** When supplied, the matching `<DynamicInit />` mounts above children. */
  init?: DynamicInitProps;
  children: ReactNode;
}

export function DynamicAuthProvider({
  init,
  children,
}: DynamicAuthProviderProps) {
  return (
    <>
      {init ? <DynamicInit {...init} /> : null}
      {children}
    </>
  );
}
