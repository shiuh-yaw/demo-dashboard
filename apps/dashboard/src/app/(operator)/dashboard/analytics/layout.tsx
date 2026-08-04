/**
 * Analytics layout - persistent chrome shared by the two analytics reports:
 * the "Analytics" title and the Engagement / Catalog sub-nav. Each report
 * (page) owns its own descriptive subtitle and content below the tabs.
 */

import { AnalyticsTabs } from "./analytics-tabs";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <AnalyticsTabs />
      </div>
      {children}
    </div>
  );
}
