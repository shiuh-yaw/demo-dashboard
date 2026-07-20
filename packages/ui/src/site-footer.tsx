/**
 * Public site footer — Dynamic marketing chrome shared by the dashboard
 * landing and demo scenario pages, lifted from
 * apps/dashboard/src/app/(public)/_components/site-footer.tsx.
 * Unthemed by design (see site-header.tsx); plain <a>, no next/link.
 */

import { Heart } from "lucide-react";

export interface SiteFooterProps {
  /**
   * Href behind the heart mark. Defaults to the dashboard's prospects
   * sign-in - demo apps render <SiteFooter /> bare so the link can't
   * drift per app; the dashboard itself overrides with its relative
   * route. Pass `null` to render a plain icon.
   */
  signInHref?: string | null;
  /**
   * Full-bleed variant for in-app (post-auth) surfaces - drops the
   * max-w-6xl so the footer aligns with a full-width app above.
   * Matches SiteHeader's `fullWidth`.
   */
  fullWidth?: boolean;
  /**
   * Marketing CTAs (dynamic.xyz / Book a call / Get a free account).
   * On in-app surfaces the merged SiteHeader's trailing slot displaces
   * these from the top bar - the footer picks them up instead.
   */
  showCtas?: boolean;
}

const LINKS = [
  { label: "Terms of service", href: "https://www.dynamic.xyz/terms-conditions/" },
  { label: "Privacy policy", href: "https://www.dynamic.xyz/privacy-policy/" },
];

export function SiteFooter({
  signInHref = "https://dynamic.dev/prospects",
  fullWidth = false,
  showCtas = false,
}: SiteFooterProps) {
  const heart = <Heart className="h-3.5 w-3.5 fill-current" />;

  return (
    <footer className="border-t border-[var(--brand-border,#e2e8f0)]/80">
      <div
        className={`mx-auto flex flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row ${
          fullWidth ? "" : "max-w-6xl"
        }`}
      >
        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-500 dark:text-slate-400">
          Made with
          {signInHref ? (
            <a
              href={signInHref}
              aria-label="Sign in"
              className="transition-colors hover:text-[#4779FF]"
            >
              {heart}
            </a>
          ) : (
            heart
          )}
          by
          <a
            href="https://www.dynamic.xyz"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            dynamic
          </a>
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>
        {showCtas ? (
          <nav className="flex items-center gap-2 text-sm sm:gap-3">
            <a
              href="https://www.dynamic.xyz/book-a-call"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center whitespace-nowrap rounded-md bg-white px-2.5 text-xs font-semibold text-[#0A0B0C] shadow-[inset_0_0_0_1px_#E7E9EE,0_4px_4px_-4px_rgba(24,39,75,0.08)] transition-shadow hover:shadow-[inset_0_0_0_1px_#D7DAE2,0_4px_4px_-4px_rgba(24,39,75,0.16)] dark:bg-[#161618] dark:text-white dark:shadow-[inset_0_0_0_1px_#2C2C30]"
            >
              Book a call
            </a>
            <a
              href="https://app.dynamic.xyz/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center whitespace-nowrap rounded-md bg-[#678BFF] px-2.5 text-xs font-semibold text-white shadow-[0_4px_4px_-4px_rgba(24,39,75,0.32)] transition-colors hover:bg-[#5578F0]"
            >
              Get a free account
            </a>
          </nav>
        ) : null}
      </div>
    </footer>
  );
}
