/**
 * Scenario-page shell — flow's two-column arrangement (live demo left,
 * code panel right; stacked demo-first below lg). Generalized from
 * apps/flow/app/checkout/page.tsx's layout markup.
 *
 * `header`/`footer` render full-width at the root (they bring their own
 * containers — e.g. SiteHeader/SiteFooter); the main column is flex-1 so
 * the footer stays pinned to the bottom on short pages.
 */

import type { ReactNode } from "react";

export function ScenarioLayout({
  header,
  hero,
  demo,
  panel,
  footer,
}: {
  /** Full-width top chrome, e.g. <SiteHeader />. */
  header?: ReactNode;
  hero: ReactNode;
  demo: ReactNode;
  panel: ReactNode;
  /** Full-width bottom chrome, e.g. <SiteFooter />. */
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-(--brand-page-bg)">
      {header}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-8 pb-20">
        {hero}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sticky offset clears the h-20 (80px) SiteHeader when present. */}
          <div
            className={`lg:col-span-5 lg:sticky self-start ${
              header ? "lg:top-[104px]" : "lg:top-6"
            }`}
          >
            {demo}
          </div>
          <div className="lg:col-span-7">{panel}</div>
        </div>
      </main>
      {footer}
    </div>
  );
}
