/**
 * Public site header — Dynamic marketing chrome shared by the dashboard
 * landing (dynamic.dev) and demo scenario pages, lifted from
 * apps/dashboard/src/app/(public)/_components/site-header.tsx.
 *
 * Deliberately NOT themed: hardcoded Dynamic palette so the catalog and
 * every demo read as one Dynamic site regardless of `--brand-*` overrides
 * (a sanctioned hex exception, like the code-frame dark chrome — see
 * AGENTS.md). Framework-neutral: plain <a>, no next/link.
 */

import { DynamicLogo } from "./dynamic-logo";

export interface SiteHeaderProps {
  /**
   * Where the logo + chip link. Default "/" (the catalog itself); demo
   * apps pass the catalog URL, e.g. "https://dynamic.dev".
   */
  homeHref?: string;
  /**
   * Pill text next to the logo: "Demos" on the catalog, the demo's name
   * (e.g. "Wallet") on a demo page.
   */
  chip?: string;
}

export function SiteHeader({ homeHref = "/", chip = "Demos" }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E7E9EE] bg-[#F4F5F7]/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href={homeHref} className="flex items-center gap-2.5">
          <DynamicLogo wordmark className="h-7 w-auto sm:h-[34px]" />
          <span className="rounded-md bg-[#4779FF]/10 px-2 py-0.5 text-sm font-semibold text-[#4779FF] max-[380px]:hidden">
            {chip}
          </span>
        </a>
        <nav className="flex items-center gap-4 text-sm sm:gap-6">
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
