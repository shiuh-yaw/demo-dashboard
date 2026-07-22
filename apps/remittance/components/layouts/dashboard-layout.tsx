import { PoweredByFooter } from "@dynamic-demos/ui";
import { ClientOnlySlot } from "@/components/ui/client-only-slot";

interface DashboardLayoutProps {
  header?: React.ReactNode;
  /**
   * Footer slot; defaults to the package `PoweredByFooter` (admin's
   * bar). AppShell overrides this with `SiteFooter` so the merged
   * unbounded/branded post-auth surfaces can pick up the #157 footer
   * CTA rule - admin doesn't pass this, so its footer is unchanged.
   */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/** Placeholder matching header height to prevent layout shift during deferred render. */
const HEADER_PLACEHOLDER = (
  <div className="h-16 border-b border-(--brand-border) bg-(--brand-surface)/80" />
);

export function DashboardLayout({
  header,
  footer,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-(--brand-page-bg)">
      {header && (
        <div className="shrink-0">
          <ClientOnlySlot placeholder={HEADER_PLACEHOLDER}>
            {header}
          </ClientOnlySlot>
        </div>
      )}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
      {footer ?? <PoweredByFooter className="shrink-0 pb-4" />}
    </div>
  );
}
