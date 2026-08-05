/**
 * "SECURED BY [logo] Fireblocks" attribution strip.
 *
 * Sits under a widget card, on the page background rather than inside the card,
 * so it reads as a property of the surface rather than of the current screen.
 * Promoted here from apps/connections because flow wants the same mark and the two
 * must not drift - a second hand-rolled copy is how the lockup ends up at two
 * different sizes on two demos.
 *
 * The logomark is `FireblocksLogomark` rather than a lockup asset, so the shield
 * tracks this package and the wordmark inherits the surrounding type.
 */

import { cn } from "@dynamic-demos/utils";

import { FireblocksLogomark } from "./fireblocks-logomark";

export interface SecuredByFireblocksProps {
  className?: string;
}

export function SecuredByFireblocks({ className }: SecuredByFireblocksProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-[7px] leading-none",
        className,
      )}
    >
      <span
        className={cn(
          "text-[10.5px] font-bold uppercase leading-none tracking-[0.05em]",
          "text-(--brand-muted)",
          // Uppercase caps are top-weighted in their line box; nudge down to
          // optically centre against the logomark.
          "translate-y-[2px]",
        )}
      >
        Secured by
      </span>
      <span className="flex items-center gap-1.5">
        <FireblocksLogomark variant="navy" className="h-[15px] w-[15px]" />
        <span className="text-[13.5px] font-semibold tracking-[-0.2px] text-(--brand-fg)">
          Fireblocks
        </span>
      </span>
    </div>
  );
}
