/**
 * Prospect hub shell. Persistent chrome shared by every hub segment: the
 * identity + nav header and the route-segment sub-nav. Each segment page
 * under this layout does its own scoped data fetch (engagement metrics
 * included), so a single view no longer fires every read-layer query at
 * once. This layout also guards the route: an out-of-scope or missing id
 * 404s here before any segment renders.
 */

import { notFound } from "next/navigation";
import { getProspectProfile, getCachedProspect } from "@/lib/actions/prospects";
import { SetBreadcrumb } from "@/components/breadcrumbs";
import { ProspectHubHeader } from "./prospect-hub-header";

interface ProspectHubLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProspectHubLayout({
  children,
  params,
}: ProspectHubLayoutProps) {
  const { id } = await params;
  const result = await getProspectProfile(id);

  if (!result.success || !result.data) {
    notFound();
  }

  // Cached read (same underlying row `getProspectProfile` above already
  // fetched this request) - a raw `services.prospects.get(id)` call here
  // would bypass that cache and re-query for status/domain alone.
  const prospect = await getCachedProspect(id);

  const status = prospect?.status === "ARCHIVED" ? "inactive" : "active";
  const domain = prospect?.domain ?? result.data.companyUrl ?? null;

  return (
    // relative: anchors the header's sentinel and gives the sticky row a
    // containing block spanning header + segment content, so it stays pinned.
    // No space-y here: it would land between the header's own sentinel and
    // sticky row (now direct siblings); the gap above segment content is an
    // explicit wrapper margin instead. -mt-4 lg:-mt-6 cancels the operator
    // content wrapper's own top padding so the hub sits flush under the top
    // bar - the sticky header's own negative top offset mirrors this so the
    // pinned row stays flush once scrolled too.
    <div className="relative -mt-4 lg:-mt-6">
      <SetBreadcrumb label={result.data.name} />
      <ProspectHubHeader
        name={result.data.name}
        domain={domain}
        status={status}
        basePath={`/dashboard/prospects/${id}`}
      />
      <div className="mt-8">{children}</div>
    </div>
  );
}
