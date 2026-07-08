import Link from "next/link";
import { DynamicLogo } from "@/components/dynamic-logo";

/**
 * Public site header. No auth/session calls — this renders for anonymous
 * visitors on every (public) route.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E7E9EE] bg-[#F4F5F7]/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <DynamicLogo width={150} height={34} className="h-7 w-auto sm:h-[34px]" />
          <span className="rounded-md bg-[#4779FF]/10 px-2 py-0.5 text-sm font-semibold text-[#4779FF] max-[380px]:hidden">
            Demos
          </span>
        </Link>
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
