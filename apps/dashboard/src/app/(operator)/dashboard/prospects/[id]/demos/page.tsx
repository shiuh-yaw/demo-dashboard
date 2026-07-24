/**
 * Prospect hub - Demos. The comparison table of demos built for this
 * prospect, with per-demo mini-stats and funnel reach. Loads only the demo
 * table data; the header + sub-nav come from the shared hub layout.
 */

import { notFound } from "next/navigation";
import { getProspectProfile } from "@/lib/actions/prospects";
import { services } from "@/lib/services";
import type { DemoSummary } from "@/lib/services";
import { ProspectDemos } from "../prospect-demos";

interface ProspectDemosPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProspectDemosPage({
  params,
}: ProspectDemosPageProps) {
  const { id } = await params;
  const result = await getProspectProfile(id);

  if (!result.success || !result.data) {
    notFound();
  }

  // Per-demo engagement for the demo grid mini-stats, keyed by config id.
  // Stats/trend/reach are independent per-demo reads - fetch all three in one
  // fan-out instead of three sequential Promise.all stages.
  const demoConfigIds = Object.values(result.data.demos).filter(
    (v): v is string => Boolean(v),
  );
  const demoEntries = await Promise.all(
    demoConfigIds.map(async (cid) => {
      const [stats, points, stages] = await Promise.all([
        services.analytics.demoSummary(cid),
        services.analytics.demoKindTimeseries([cid], "all", "30d"),
        services.analytics.demoKindFunnel([cid], "all"),
      ]);
      const first = stages[0]?.count ?? 0;
      const last = stages[stages.length - 1]?.count ?? 0;
      return {
        cid,
        stats,
        trend: points.map((p) => p.sessions),
        reach: first > 0 ? last / first : 0,
      };
    }),
  );
  const demoStats: Record<string, DemoSummary> = Object.fromEntries(
    demoEntries.map((e) => [e.cid, e.stats]),
  );
  const demoTrends: Record<string, number[]> = Object.fromEntries(
    demoEntries.map((e) => [e.cid, e.trend]),
  );
  const demoReach: Record<string, number> = Object.fromEntries(
    demoEntries.map((e) => [e.cid, e.reach]),
  );

  return (
    <ProspectDemos
      profile={result.data}
      demoStats={demoStats}
      demoTrends={demoTrends}
      demoReach={demoReach}
    />
  );
}
