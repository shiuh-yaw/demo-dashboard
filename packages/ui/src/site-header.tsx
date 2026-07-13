/**
 * Public site header - Dynamic marketing chrome shared by the dashboard
 * landing (dynamic.dev) and demo scenario pages, lifted from
 * apps/dashboard/src/app/(public)/_components/site-header.tsx.
 *
 * Deliberately NOT themed: hardcoded Dynamic palette so the catalog and
 * every demo read as one Dynamic site regardless of `--brand-*` overrides
 * (a sanctioned hex exception, like the code-frame dark chrome - see
 * AGENTS.md). Framework-neutral: plain <a>, no next/link; the demo grid
 * opens on pure CSS hover/focus, so this stays a server component.
 */

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
}

export function SiteHeader({
  homeHref = "/",
  chip = "Demos",
  demos = DEMO_DIRECTORY,
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
        className="flex items-center gap-0.5 rounded-md px-1 py-0.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
      >
        Demos
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150 group-hover:rotate-180" />
      </a>
      {/* pt-2 bridges the hover gap between crumb and panel. */}
      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="grid w-[440px] grid-cols-2 gap-1 rounded-xl border border-[#E7E9EE] bg-white p-2 shadow-[0_12px_32px_-12px_rgba(24,39,75,0.32)]">
          {demos.map((demo) => (
            <a
              key={demo.name}
              href={demo.href}
              className={`rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F4F5F7] ${
                demo.name === chip ? "bg-[#4779FF]/5" : ""
              }`}
            >
              <span className="block text-sm font-semibold text-[#0A0B0C]">
                {demo.name}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-slate-500">
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
    <header className="sticky top-0 z-40 border-b border-[#E7E9EE] bg-[#F4F5F7]/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <a href={homeHref} className="flex items-center">
            <DynamicLogo wordmark className="h-7 w-auto sm:h-[34px]" />
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
        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          <a
            href="https://www.dynamic.xyz"
            target="_blank"
            rel="noreferrer"
            className="hidden font-semibold text-slate-700 transition-colors hover:text-slate-900 sm:inline"
          >
            dynamic.xyz
          </a>
          <a
            href="https://www.dynamic.xyz/book-a-call"
            target="_blank"
            rel="noreferrer"
            className="hidden whitespace-nowrap rounded-md bg-white px-3 py-2.5 font-semibold text-[#0A0B0C] shadow-[inset_0_0_0_1px_#E7E9EE,0_4px_4px_-4px_rgba(24,39,75,0.08)] transition-shadow hover:shadow-[inset_0_0_0_1px_#D7DAE2,0_4px_4px_-4px_rgba(24,39,75,0.16)] sm:inline"
          >
            Book a call
          </a>
          <a
            href="https://app.dynamic.xyz/"
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap rounded-md bg-[#678BFF] px-3 py-2.5 font-semibold text-white shadow-[0_4px_4px_-4px_rgba(24,39,75,0.32)] transition-colors hover:bg-[#5578F0]"
          >
            <span className="sm:hidden">Free account</span>
            <span className="hidden sm:inline">Get a free account</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
