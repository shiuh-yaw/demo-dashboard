/**
 * Scenario-page chrome — generalized from apps/flow/components/
 * scenario-chrome.tsx (demos-surface phase 2 v2). Flow's visual
 * language verbatim; per-app copy, icons, and logos arrive as props.
 * Flow itself still carries its local copy until its migration PR.
 *
 * Token roles (D-030): the title accent phrase and bullet checks ride
 * --brand-accent (visible under charcoal-primary brands like wallet);
 * chips/eyebrow ride the neutral tokens exactly as in flow.
 */

import type { ReactNode } from "react";
import { Check } from "lucide-react";

export function ScenarioEyebrow({ num, name }: { num: string; name: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-(--brand-muted) font-medium">
        {num} · {name}
      </span>
      <span className="inline-flex items-center h-5 px-2 rounded-full bg-(--brand-row-bg) text-(--brand-muted) border border-(--brand-border) text-[10px] font-medium uppercase tracking-[0.14em]">
        Demo
      </span>
    </div>
  );
}

export function RouteChip({
  icon,
  label,
  detail,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-(--brand-surface) border border-(--brand-border) pl-2 pr-3 py-1.5">
      <span
        aria-hidden
        className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-[6px]"
      >
        {icon}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] font-semibold text-(--brand-fg)">
          {label}
        </span>
        <span className="text-[10px] text-(--brand-muted)">{detail}</span>
      </span>
    </div>
  );
}

export function ChipArrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="text-(--brand-muted) shrink-0"
      aria-hidden
    >
      <path
        d="M2 7h10m0 0L8 3m4 4L8 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface ScenarioHeroProps {
  /**
   * Optional brand logo node rendered bare above the headline (bring
   * your own margin). With <SiteHeader> carrying default Dynamic
   * branding, pass a logo only for custom-branded chrome.
   */
  logo?: ReactNode;
  /** Optional "01 · Name · DEMO" line above the headline. */
  eyebrow?: { num: string; name: string };
  title: string;
  /** Trailing headline phrase rendered in --brand-accent. */
  titleAccent?: string;
  /** Subhead. ReactNode so apps can embed cites/links. */
  pitch: ReactNode;
  /** Optional "what to try" items with check icons. */
  bullets?: string[];
  /** Route chips row: compose from RouteChip + ChipArrow. */
  chips?: ReactNode;
}

export function ScenarioHero({
  logo,
  eyebrow,
  title,
  titleAccent,
  pitch,
  bullets,
  chips,
}: ScenarioHeroProps) {
  return (
    <>
      {logo}
      <section className="flex flex-col gap-5 max-w-3xl">
        {eyebrow ? (
          <ScenarioEyebrow num={eyebrow.num} name={eyebrow.name} />
        ) : null}

        <h1 className="!text-[clamp(2rem,4vw,3rem)] !leading-[1.05] text-balance text-(--brand-fg) font-semibold tracking-[-0.02em]">
          {title}
          {titleAccent ? (
            <>
              {" "}
              <span className="text-(--brand-accent)">{titleAccent}</span>
            </>
          ) : null}
        </h1>

        <p className="text-base lg:text-lg text-(--brand-fg-secondary) max-w-2xl">
          {pitch}
        </p>

        {bullets && bullets.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-2.5 text-sm text-(--brand-fg-secondary)"
              >
                <Check
                  aria-hidden
                  strokeWidth={2.5}
                  className="mt-0.5 h-4 w-4 shrink-0 text-(--brand-accent)"
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {chips ? (
          <div className="flex items-center gap-3 pt-1 flex-wrap">{chips}</div>
        ) : null}
      </section>
    </>
  );
}
