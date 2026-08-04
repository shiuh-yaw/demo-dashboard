/**
 * Catalog analytics - the public demo-catalog funnel (visits to the catalog
 * and which demos those visitors launch). Org-wide, isolated from the
 * prospect share-link engagement report on the Engagement tab: this reads
 * `catalogFunnel()`, which never touches the prospect share-link join.
 */

import { requireUser } from "@/lib/auth/gtm";
import { services } from "@/lib/services";
import { CatalogFunnel } from "../catalog-funnel";

export const dynamic = "force-dynamic";

export default async function CatalogAnalyticsPage() {
  await requireUser();

  const catalog = await services.analytics.catalogFunnel();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Visits to the demo catalog and which demos those visitors launch.
      </p>
      <CatalogFunnel data={catalog} />
    </div>
  );
}
