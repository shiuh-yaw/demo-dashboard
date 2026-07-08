import Link from "next/link";
import { Heart } from "lucide-react";

/**
 * Public site footer with dynamic.xyz links.
 */
export function SiteFooter() {
  const links = [
    { label: "Docs", href: "https://www.dynamic.xyz/docs" },
    { label: "GitHub", href: "https://github.com/dynamic-labs-oss/" },
    { label: "Terms of service", href: "https://www.dynamic.xyz/terms-conditions/" },
    { label: "Privacy policy", href: "https://www.dynamic.xyz/privacy-policy/" },
  ];

  return (
    <footer className="border-t border-slate-200/80">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-500">
          Made with
          <Link
            href="/brands"
            aria-label="Sign in"
            className="transition-colors hover:text-[#4779FF]"
          >
            <Heart className="h-3.5 w-3.5 fill-current" />
          </Link>
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
          {links.map((link) => (
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
