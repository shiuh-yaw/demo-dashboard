"use client";

import { Spinner } from "@dynamic-demos/ui";

/** Matches large deposit widget loading states (initial load, provisioning). */
export const depositWidgetLargeSpinnerClassName = "h-11 w-11 border-[3px]";

export function DepositFullCardLoadingBody() {
  return (
    <div className="flex min-h-44 items-center justify-center">
      <Spinner size="lg" className={depositWidgetLargeSpinnerClassName} />
    </div>
  );
}
