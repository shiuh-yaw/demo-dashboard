"use client";

import { Zap } from "lucide-react";
import { Button } from "@dynamic-demos/ui";

import { usePayoutContext } from "@/contexts/payout-context";

/**
 * "Simulate payout" trigger, rendered in each screen's page-heading row.
 *
 * Was a `fixed bottom-6 right-6` pill floating over the content. Moved into the
 * heading because that is where the page's primary action belongs - and because a
 * floating pill sat on top of the footer and the payout cards at short viewport
 * heights.
 *
 * A component rather than markup repeated per screen: the trigger has to appear
 * on all three routes (it used to come from the shell, which rendered once for
 * all of them), so inlining it would mean three copies drifting apart.
 */
export function SimulatePayoutButton() {
  const { openModal } = usePayoutContext();
  // Shared Button, not a hand-rolled pill: it already carries the primary
  // treatment, the transition and the disabled handling, and it themes through
  // --widget-primary like every other CTA in the demos.
  return (
    <Button onClick={openModal} className="shrink-0" aria-label="Simulate payout">
      <Zap className="h-4 w-4" />
      Simulate payout
    </Button>
  );
}
