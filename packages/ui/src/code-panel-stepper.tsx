"use client";

/**
 * Numbered integration stepper for the SDK/API panes — generalized
 * from apps/flow/components/code-panel-stepper.tsx (cn now comes from
 * @dynamic-demos/utils).
 */

import { cn } from "@dynamic-demos/utils";
import { CodeFrame, DocsLink, renderProse } from "./code-panel-atoms";
import type { CodeStep } from "./code-panel-types";

export function Stepper({ steps }: { steps: CodeStep[] }) {
  return (
    <ol
      className="relative flex flex-col m-0 p-0"
      style={{ listStyle: "none" }}
    >
      <span
        aria-hidden
        className="absolute left-[13.5px] top-3.5 bottom-3.5 w-px bg-(--brand-border)"
      />
      {steps.map((step, i) => (
        <li
          key={step.num}
          className={cn("relative pl-11", i < steps.length - 1 && "pb-8")}
        >
          <span
            aria-hidden
            className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-(--brand-surface) border-[1.5px] border-(--brand-accent) text-[11px] font-mono font-semibold text-(--brand-accent)"
          >
            {step.num}
          </span>
          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h3 className="text-[15px] font-semibold text-(--brand-fg) leading-snug">
                {step.title}
              </h3>
              <DocsLink href={step.docsUrl} />
            </div>
            <p className="text-sm text-(--brand-fg-secondary) leading-relaxed">
              {renderProse(step.prose)}
            </p>
          </div>
          <CodeFrame
            filename={step.filename}
            html={step.html}
            rawCode={step.rawCode}
          />
        </li>
      ))}
    </ol>
  );
}
