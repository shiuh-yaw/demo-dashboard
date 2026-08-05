"use client";

import dynamic from "next/dynamic";

import { ConnectSkeletonCard } from "./connect-skeleton";

/**
 * The connect flow, browser-only.
 *
 * The flow reads `window.location` during render (incoming `redirect_uri` /
 * `nonce` / `?wallet=` / `?debug`) and the Dynamic SDK's wallet discovery only
 * exists in a browser, so there is nothing meaningful to server-render. Loading
 * it with `ssr: false` keeps those reads legal instead of scattering
 * `typeof window` guards through a 1,000-line state machine.
 *
 * The chunk pulls in ConnectWidget, not ConnectFlow directly, so the Dynamic
 * provider mounts inside this boundary and the tree shape never changes once
 * mounted. The fallback is the same skeleton the flow shows while the SDK
 * initialises, so the hand-off is invisible.
 */
export const ConnectFlowLazy = dynamic(
  () => import("./connect-widget").then((m) => ({ default: m.ConnectWidget })),
  {
    ssr: false,
    loading: () => <ConnectSkeletonCard />,
  },
);
