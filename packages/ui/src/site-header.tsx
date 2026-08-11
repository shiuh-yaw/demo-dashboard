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
import { ChevronDown, Phone } from "lucide-react";
import { DynamicLogo } from "./dynamic-logo";
import { DEMO_DIRECTORY, type DemoDirectoryEntry } from "./demo-directory";
import { BookACallLink } from "./book-a-call";
import { DEMOS_CATALOG_URL } from "./catalog-url";

export interface SiteHeaderProps {
  /**
   * Where the logo + "Demos" crumb link. Defaults to the shared
   * DEMOS_CATALOG_URL so demo apps don't hardcode it; the dashboard (which
   * IS the catalog) passes a same-site "/".
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
   * panel). When set it REPLACES the marketing nav (Book
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
  /**
   * Whether the bar pins to the top on scroll. Default true (all marketing
   * and demo surfaces). flow opts out (sticky={false}) so its top chrome
   * scrolls away with the page.
   */
  sticky?: boolean;
  /**
   * A prospect config is active for this request. Drops the "Demos" crumb and
   * the demo-name chip, so a branded demo stops advertising the Dynamic demos
   * catalog inside a prospect's product.
   *
   * For scenario-shaped demos `buildScenarioChrome` handles this by swapping the
   * whole header for `ScenarioBrandRow`. Console-shaped demos (visa-direct) have
   * no hero to put a brand row in and keep this header across every route, so
   * they pass `isBranded` here instead and supply the prospect mark via `logo`.
   *
   * The marketing CTAs need no flag - `trailing` already displaces them.
   */
  isBranded?: boolean;
}

export function SiteHeader({
  homeHref = DEMOS_CATALOG_URL,
  chip = "Demos",
  demos = DEMO_DIRECTORY,
  fullWidth = false,
  center,
  trailing,
  logo,
  logoHref,
  sticky = true,
  isBranded = false,
}: SiteHeaderProps) {
  // On the catalog the "Demos" pill IS the current location; on demo
  // pages it becomes the ancestor crumb with the demo name as the pill.
  // Branded: neither renders - see `isBranded`.
  const onDemoPage = !isBranded && chip !== "Demos";

  // The hover grid only appears on demo pages - the catalog page IS the
  // grid, so its "Demos" pill stays a plain label (no chevron, no panel).
  const demosCrumb = onDemoPage ? (
    // CSS-only toggle so the header stays a server component (no JS): desktop
    // opens the panel on hover; mobile taps the label to toggle a checkbox. The
    // panel is an anchored dropdown on desktop and a full-width overlay below
    // the bar on mobile, instead of a panel that runs off-screen.
    <div className="group/demos relative">
      <input
        type="checkbox"
        id="site-demos-menu"
        className="peer sr-only"
        aria-label="Toggle demos menu"
      />
      <label
        htmlFor="site-demos-menu"
        className="flex cursor-pointer select-none items-center gap-0.5 rounded-md px-1 py-0.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 peer-checked:[&>svg]:rotate-180 dark:text-slate-400 dark:hover:text-slate-200 sm:group-hover/demos:[&>svg]:rotate-180"
      >
        Demos
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150" />
      </label>
      <div className="fixed inset-x-0 top-16 z-50 hidden px-4 pt-2 peer-checked:block sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:px-0 sm:group-hover/demos:block">
        <div className="grid max-h-[70vh] grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-[#E7E9EE] bg-white p-2 shadow-[0_12px_32px_-12px_rgba(24,39,75,0.32)] dark:border-[#2C2C30] dark:bg-[#161618] sm:max-h-none sm:w-[440px] sm:grid-cols-2 sm:overflow-visible">
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
    <header className={`${sticky ? "sticky top-0 z-40 " : ""}border-b border-[#E7E9EE] bg-[#F4F5F7]/90 backdrop-blur dark:border-[#2C2C30] dark:bg-[#0A0A0A]/90`}>
      <div
        className={`mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 ${
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
                  className="h-6 w-auto sm:hidden"
                />
                <DynamicLogo wordmark className="hidden h-[34px] w-auto sm:block" />
              </>
            )}
          </a>
          <div className="flex items-center gap-1.5 max-[380px]:hidden">
            {isBranded ? null : demosCrumb}
            {onDemoPage && (
              // Desktop-only breadcrumb: on mobile the Demos dropdown already
              // covers navigation, so the demo-name chip is dropped to declutter.
              <span className="hidden items-center gap-1.5 sm:flex">
                <span className="text-sm font-medium text-slate-400">/</span>
                <span className="rounded-md bg-[#4779FF]/10 px-2 py-0.5 text-sm font-semibold text-[#4779FF]">
                  {chip}
                </span>
              </span>
            )}
          </div>
        </div>
        {center ? (
          // md, not sm: between those widths the logo + breadcrumb still
          // reach into the center and a nav would overlap them. Apps
          // provide a menu-row fallback below md (remittance's UserMenu).
          <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
            {center}
          </div>
        ) : null}
        {trailing ? (
          <div className="flex items-center gap-2 sm:gap-3">{trailing}</div>
        ) : (
        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          {/* Mobile: a compact phone icon. sm+: the full "Book a call" button. */}
          <BookACallLink
            aria-label="Book a call"
            className="inline-flex h-8 w-8 items-center justify-center whitespace-nowrap rounded-md bg-white font-semibold text-[#0A0B0C] shadow-[inset_0_0_0_1px_#E7E9EE,0_4px_4px_-4px_rgba(24,39,75,0.08)] transition-shadow hover:shadow-[inset_0_0_0_1px_#D7DAE2,0_4px_4px_-4px_rgba(24,39,75,0.16)] dark:bg-[#161618] dark:text-white dark:shadow-[inset_0_0_0_1px_#2C2C30] sm:h-10 sm:w-auto sm:px-3"
          >
            <Phone className="h-4 w-4 sm:hidden" aria-hidden="true" />
            <span className="hidden text-sm sm:inline">Book a call</span>
          </BookACallLink>
          <a
            href="https://app.dynamic.xyz/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center whitespace-nowrap rounded-md bg-[#678BFF] px-2.5 text-[13px] font-semibold text-white shadow-[0_4px_4px_-4px_rgba(24,39,75,0.32)] transition-colors hover:bg-[#5578F0] sm:h-10 sm:px-3 sm:text-sm"
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
