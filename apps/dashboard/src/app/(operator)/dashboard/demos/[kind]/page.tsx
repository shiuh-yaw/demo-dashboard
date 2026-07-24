/**
 * Internal operator demo-detail. An informational + actionable dashboard for a
 * demo TYPE: a full hero identity header with the launch/configure actions,
 * then its cross-prospect analytics as the focus (two-tier visibility,
 * counts-only). This is operator chrome - NOT the public marketing page at
 * /demos/[slug].
 */

import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { Badge, Button } from "@/components/droplet-client";
import { SetBreadcrumb } from "@/components/breadcrumbs";
import { displayHost } from "@/lib/display-host";
import { LANDING_DEMOS, demoDetailId } from "@/lib/landing/demos";
import { services } from "@/lib/services";
import { isConfigurableKind } from "@/lib/analytics/demo-kind";
import { listProspectOptions } from "@/lib/actions/prospects";
import type {
  DemoKindTimeseriesPoint,
  FunnelStage,
} from "@/lib/services/types";
import { ConfigureForProspect } from "./configure-for-prospect";
import { resolveKindAnalyticsScope } from "./actions";
import {
  DEFAULT_KIND_ANALYTICS_RANGE,
  DemoKindAnalytics,
  type AggregateCounts,
} from "./demo-kind-analytics";

export default async function DemoDetailPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const demo = LANDING_DEMOS.find((d) => demoDetailId(d) === kind);
  if (!demo) notFound();

  const demoKind = demo.kind;
  const configurable = isConfigurableKind(kind);

  // SSR-seed the "Customize for a prospect" picker so its first open is
  // warm - see `ProspectPickerProps.initialData`. Skipped when the kind
  // isn't configurable, since the trigger never renders in that case.
  const [analytics, prospectOptionsResult] = await Promise.all([
    demoKind ? loadKindAnalytics(demoKind) : Promise.resolve(null),
    configurable ? listProspectOptions() : Promise.resolve(null),
  ]);
  const initialProspectOptions = prospectOptionsResult?.success
    ? prospectOptionsResult.data
    : undefined;

  return (
    <div className="space-y-8">
      <SetBreadcrumb label={demo.name} />

      {/* Identity header: title, meta, description, actions. */}
      <div className="space-y-4 rounded-xl border border-border-divider bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground">
              {demo.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted-foreground">
              <Badge variant={demo.showOnLanding ? "success" : "inactive"}>
                {demo.showOnLanding ? "Listed publicly" : "Internal only"}
              </Badge>
              {demo.url && (
                <>
                  <span aria-hidden>&middot;</span>
                  <a
                    href={demo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                  >
                    {displayHost(demo.url)}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {demo.url && (
              <Button asChild variant="secondary">
                <a href={demo.url} target="_blank" rel="noreferrer">
                  View demo
                  <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
            )}
            {configurable && (
              <ConfigureForProspect
                kind={kind}
                demoName={demo.name}
                initialProspectOptions={initialProspectOptions}
              />
            )}
          </div>
        </div>

        {/* Description on its own row, full width - no mid-word truncation. */}
        <p className="text-sm text-muted-foreground">{demo.description}</p>
      </div>

      {/* Analytics - the focus of the page, set apart from the header above. */}
      <section className="space-y-3 border-t border-border-divider pt-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Analytics</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {analytics && demoKind
              ? `Engagement across every prospect running ${demo.name}, counts only. The scope filter narrows to prospects you or your team own.`
              : "This demo isn't branded per prospect, so there's no cross-prospect analytics here."}
          </p>
        </div>
        {analytics && demoKind && (
          <DemoKindAnalytics
            kind={demoKind}
            aggregates={analytics.aggregates}
            initialTimeseries={analytics.initialTimeseries}
            initialFunnel={analytics.initialFunnel}
          />
        )}
      </section>
    </div>
  );
}

/**
 * Resolve the Analytics dashboard's Tier-1 data server-side: the three scope
 * aggregates (all/mine/team, all-time counts) plus the initial
 * sessions-over-time series for the default scope + range. Every value here
 * is counts-only, never per-prospect identity - see
 * `AnalyticsService.demoKindSummary` / `demoKindTimeseries`. Scope resolution
 * is shared with the client filter's server action (`resolveKindAnalyticsScope`)
 * so the two never drift apart.
 */
async function loadKindAnalytics(
  kind: NonNullable<(typeof LANDING_DEMOS)[number]["kind"]>,
): Promise<{
  aggregates: {
    all: AggregateCounts;
    mine: AggregateCounts;
    team: AggregateCounts;
  };
  initialTimeseries: DemoKindTimeseriesPoint[];
  initialFunnel: FunnelStage[];
}> {
  const [allResolved, mineResolved, teamResolved] = await Promise.all([
    resolveKindAnalyticsScope(kind, "all"),
    resolveKindAnalyticsScope(kind, "mine"),
    resolveKindAnalyticsScope(kind, "team"),
  ]);
  const demoConfigIds = allResolved.demoConfigIds;

  const [aggAll, aggMine, aggTeam, initialTimeseries, initialFunnel] =
    await Promise.all([
      services.analytics.demoKindSummary(demoConfigIds, allResolved.scope),
      services.analytics.demoKindSummary(demoConfigIds, mineResolved.scope),
      services.analytics.demoKindSummary(demoConfigIds, teamResolved.scope),
      services.analytics.demoKindTimeseries(
        demoConfigIds,
        allResolved.scope,
        DEFAULT_KIND_ANALYTICS_RANGE,
      ),
      services.analytics.demoKindFunnel(
        demoConfigIds,
        allResolved.scope,
        DEFAULT_KIND_ANALYTICS_RANGE,
      ),
    ]);

  return {
    aggregates: { all: aggAll, mine: aggMine, team: aggTeam },
    initialTimeseries,
    initialFunnel,
  };
}
