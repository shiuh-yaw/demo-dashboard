/**
 * Pure prose renderer for code-panel copy: backtick-delimited spans
 * become styled inline-code chips. Deliberately NOT a "use client"
 * module - server components (e.g. flow's code-panel panes) call it
 * during server render, and client modules can import it freely.
 */

import type { ReactNode } from "react";

export function renderProse(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={i}
          className="font-mono text-[12px] px-1.5 py-0.5 rounded-md bg-(--brand-row-bg) border border-(--brand-border) text-(--brand-fg)"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
