/**
 * Public site header - Dynamic marketing chrome shared by the dashboard
 * landing (dynamic.dev) and demo scenario pages, lifted from
 * apps/dashboard/src/app/(public)/_components/site-header.tsx.
 *
 * Deliberately NOT brand-themed: hardcoded Dynamic palette so the catalog
 * and every demo read as one Dynamic site regardless of `--brand-*`
 * overrides (a sanctioned hex exception, like the code-frame dark chrome
 * - see AGENTS.md). It DOES carry `dark:` scheme variants: class-gated,
 * so they activate only in apps that set `.dark` (trade's theme toggle)
 * and stay inert elsewhere. Framework-neutral: plain <a>, no next/link;
 * the demo grid opens on pure CSS hover/focus, so this stays a server
 * component.
 */

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { DynamicLogo } from "./dynamic-logo";
import { DEMO_DIRECTORY, type DemoDirectoryEntry } from "./demo-directory";

export interface SiteHeaderProps {
  /**
   * Where the logo + "Demos" crumb link. Default "/" (the catalog
   * itself); demo apps pass the catalog URL, e.g. "https://dynamic.dev".
   */
  homeHref?: string;
  /**
   * Current page label: "Demos" on the catalog (single pill), the demo's
   * name (e.g. "Wallet") on a demo page - rendered as a "Demos / Wallet"
   * breadcrumb so visitors can navigate back.
   */
  chip?: string;
  /** Entries in the "Demos" hover grid; defaults to the shared directory. */
  demos?: DemoDirectoryEntry[];
  /**
   * Full-bleed variant for in-app (post-auth) surfaces: the inner
   * container drops its max-w-6xl so the bar's content aligns with a
   * full-width app below. Default false (centered marketing width).
   */
  fullWidth?: boolean;
  /**
   * Optional app content rendered in the middle of the bar (e.g. the
   * demo's own nav tabs). Hidden below sm - in-app nav on phones stays
   * the app's concern.
   */
  center?: ReactNode;
  /**
   * Optional app content for the right side (e.g. the demo's user
   * panel). When set it REPLACES the marketing nav (dynamic.xyz / Book
   * a call / Get a free account) - a signed-in demo bar carries the
   * app's controls, not the marketing CTAs. May be a client island;
   * the header itself stays a server component.
   */
  trailing?: ReactNode;
  /**
   * Optional mark replacing the Dynamic lockup - for demos whose
   * identity is their own product wordmark (flow's Fireblocks Flow
   * mark). The Demos crumb and hover grid stay, so the page still
   * reads as part of the Dynamic demos site.
   */
  logo?: ReactNode;
  /**
   * Where the logo links. Defaults to homeHref; apps with an internal
   * landing (flow) point the logo at "/" while the Demos crumb keeps
   * homeHref (the catalog).
   */
  logoHref?: string;
}

export function SiteHeader({
  homeHref = "/",
  chip = "Demos",
  demos = DEMO_DIRECTORY,
  fullWidth = false,
  center,
  trailing,
  logo,
  logoHref,
}: SiteHeaderProps) {
  // On the catalog the "Demos" pill IS the current location; on demo
  // pages it becomes the ancestor crumb with the demo name as the pill.
  const onDemoPage = chip !== "Demos";

  // The hover grid only appears on demo pages - the catalog page IS the
  // grid, so its "Demos" pill stays a plain label (no chevron, no panel).
  const demosCrumb = onDemoPage ? (
    <div className="group relative">
      <a
        href={homeHref}
        className="flex items-center gap-0.5 rounded-md px-1 py-0.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        Demos
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150 group-hover:rotate-180" />
      </a>
      {/* pt-2 bridges the hover gap between crumb and panel. */}
      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="grid w-[440px] grid-cols-2 gap-1 rounded-xl border border-[#E7E9EE] bg-white p-2 dark:border-[#2C2C30] dark:bg-[#161618] shadow-[0_12px_32px_-12px_rgba(24,39,75,0.32)]">
          {demos.map((demo) => (
            <a
              key={demo.name}
              href={demo.href}
              className={`rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F4F5F7] dark:hover:bg-[#1C1C1E] ${
                demo.name === chip ? "bg-[#4779FF]/5" : ""
              }`}
            >
              <span className="block text-sm font-semibold text-[#0A0B0C] dark:text-white">
                {demo.name}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">
                {demo.tagline}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  ) : (
    <span className="rounded-md bg-[#4779FF]/10 px-2 py-0.5 text-sm font-semibold text-[#4779FF]">
      Demos
    </span>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[#E7E9EE] bg-[#F4F5F7]/90 backdrop-blur dark:border-[#2C2C30] dark:bg-[#0A0A0A]/90">
      <div
        className={`mx-auto flex h-20 items-center justify-between gap-4 px-4 sm:px-6 ${
          fullWidth ? "" : "max-w-6xl"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <a href={logoHref ?? homeHref} className="flex items-center">
            {logo ?? (
              <>
                {/* Below sm the tagline collapses into sub-pixel fuzz -
                    render the tagline-less lockup there instead. */}
                <DynamicLogo
                  wordmark
                  tagline={false}
                  className="h-7 w-auto sm:hidden"
                />
                <DynamicLogo wordmark className="hidden h-[34px] w-auto sm:block" />
              </>
            )}
          </a>
          <div className="flex items-center gap-1.5 max-[380px]:hidden">
            {demosCrumb}
            {onDemoPage && (
              <>
                <span className="text-sm font-medium text-slate-400">/</span>
                <span className="rounded-md bg-[#4779FF]/10 px-2 py-0.5 text-sm font-semibold text-[#4779FF]">
                  {chip}
                </span>
              </>
            )}
          </div>
        </div>
        {center ? (
          <div className="hidden min-w-0 flex-1 items-center justify-center sm:flex">
            {center}
          </div>
        ) : null}
        {trailing ? (
          <div className="flex items-center gap-2 sm:gap-3">{trailing}</div>
        ) : (
        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          <a
            href="https://www.dynamic.xyz"
            target="_blank"
            rel="noreferrer"
            className="hidden font-semibold text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white sm:inline"
          >
            dynamic.xyz
          </a>
          <a
            href="https://www.dynamic.xyz/book-a-call"
            target="_blank"
            rel="noreferrer"
            className="hidden h-10 items-center whitespace-nowrap rounded-md bg-white px-3 font-semibold text-[#0A0B0C] shadow-[inset_0_0_0_1px_#E7E9EE,0_4px_4px_-4px_rgba(24,39,75,0.08)] transition-shadow hover:shadow-[inset_0_0_0_1px_#D7DAE2,0_4px_4px_-4px_rgba(24,39,75,0.16)] dark:bg-[#161618] dark:text-white dark:shadow-[inset_0_0_0_1px_#2C2C30] sm:inline-flex"
          >
            Book a call
          </a>
          <a
            href="https://app.dynamic.xyz/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center whitespace-nowrap rounded-md bg-[#678BFF] px-3 font-semibold text-white shadow-[0_4px_4px_-4px_rgba(24,39,75,0.32)] transition-colors hover:bg-[#5578F0]"
          >
            <span className="sm:hidden">Free account</span>
            <span className="hidden sm:inline">Get a free account</span>
          </a>
        </nav>
        )}
      </div>
    </header>
  );
}
