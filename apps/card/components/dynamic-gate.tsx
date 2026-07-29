"use client";

/**
 * Blocks children until the Dynamic client finishes initializing. This is the
 * structural fix for the "empty login card" bug: nothing reads projectSettings
 * / user / wallet before init is done, and re-renders are driven by the
 * official useInitStatus hook (no hand-rolled store).
 */

import type { DynamicInitStatus } from "@dynamic-labs-sdk/client";
import { useInitStatus } from "@dynamic-labs-sdk/react-hooks";
import { ErrorCard, Spinner } from "@dynamic-demos/ui";

/**
 * Canonical loading state for the app - a centered spinner sized to sit in
 * the scenario demo column (padded, not full-height). A bare spinner, NOT
 * wrapped in a WidgetCard, which has no intrinsic width and collapses to
 * a thin vertical pill around a lone spinner. Every loading screen uses this.
 * `caption` is optional so existing call sites (init gate, page guards) keep
 * their bare-spinner look; it exists for states that need to tell the user
 * what's happening (e.g. card auto-reissue in `card-view.tsx`).
 */
export function FullScreenSpinner({ caption }: { caption?: string } = {}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Spinner size="lg" />
      {caption ? (
        <p className="text-sm text-(--brand-muted)">{caption}</p>
      ) : null}
    </div>
  );
}

/**
 * Pure decision function behind the gate's render branch. Extracted so it is
 * unit-testable without a DOM-rendering library — apps/card has no
 * @testing-library/react dependency, so the component itself is not
 * render-tested here; this pure function is.
 */
export function resolveGateState(
  initStatus: DynamicInitStatus | undefined,
): "spinner" | "error" | "ready" {
  if (initStatus === "failed") return "error";
  if (initStatus !== "finished") return "spinner";
  return "ready";
}

export function DynamicGate({ children }: { children: React.ReactNode }) {
  const { data: initStatus } = useInitStatus();
  const state = resolveGateState(initStatus);

  if (state === "error") {
    return (
      <div className="flex items-center justify-center py-16">
        <ErrorCard
          title="Could not start"
          message="The Dynamic client failed to initialize. Refresh to try again."
        />
      </div>
    );
  }

  if (state === "spinner") {
    return <FullScreenSpinner />;
  }

  return <>{children}</>;
}
