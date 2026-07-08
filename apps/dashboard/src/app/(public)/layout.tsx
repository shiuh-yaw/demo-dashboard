import { Figtree } from "next/font/google";

import { SiteHeader } from "./_components/site-header";
import { SiteFooter } from "./_components/site-footer";
import { ForceLightTheme } from "./_components/force-light-theme";

const figtree = Figtree({ subsets: ["latin"] });

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Public Layout
 *
 * Chrome for the unauthenticated landing pages. Intentionally makes no
 * auth/session calls and does not load Providers (Dynamic SDK) — keep it
 * that way so the public pages stay static and anonymous. Typeset in
 * Figtree (the Fireblocks/Dynamic web font), scoped to this tree only.
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div
      className={`${figtree.className} flex min-h-screen flex-col bg-[#F4F5F7] text-slate-900`}
    >
      <ForceLightTheme />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
