/**
 * Public site footer — Dynamic marketing chrome shared by the dashboard
 * landing and demo scenario pages, lifted from
 * apps/dashboard/src/app/(public)/_components/site-footer.tsx.
 * Unthemed by design (see site-header.tsx); plain <a>, no next/link.
 */

import { Heart } from "lucide-react";

export interface SiteFooterProps {
  /**
   * Optional href behind the heart mark (the dashboard uses its /brands
   * sign-in). Omitted → the heart renders as a plain icon.
   */
  signInHref?: string;
}

const LINKS = [
  { label: "Docs", href: "https://www.dynamic.xyz/docs" },
  { label: "GitHub", href: "https://github.com/dynamic-labs-oss/" },
  { label: "Terms of service", href: "https://www.dynamic.xyz/terms-conditions/" },
  { label: "Privacy policy", href: "https://www.dynamic.xyz/privacy-policy/" },
];

export function SiteFooter({ signInHref }: SiteFooterProps) {
  const heart = <Heart className="h-3.5 w-3.5 fill-current" />;

  return (
    <footer className="border-t border-[var(--brand-border,#e2e8f0)]/80">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-500">
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
        <nav className="flex items-center gap-6 text-sm">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-slate-500 transition-colors hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
