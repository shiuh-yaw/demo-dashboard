"use client";

/**
 * Prospect hub - Overview (default segment). Momentum + Depth: the prospect's
 * engagement metric cards, a sessions-over-time momentum hero, an engagement
 * funnel (Viewed -> Interacted -> Authenticated, whatever stages come back),
 * and a recent-activity feed. Client component: owns lucide icons, the charts
 * package, and the range filter (all client-only) so none cross the RSC
 * boundary. Pure formatting helpers live in ./prospect-overview-stats.
 *
 * Read scope is the prospect's own visibility, already gated by the page; the
 * momentum range action re-derives that scope server-side on every switch.
 */

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Activity, BarChart3, Clock, Eye, MousePointerClick, Users } from "lucide-react";
import { AreaChart } from "@dynamic-demos/charts";
import {
  Button,
  EmptyState,
  MetricCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/droplet-client";
import { EngagementFunnel } from "@/components/analytics/engagement-funnel";
import type {
  AnalyticsTimeRange,
  DemoKindTimeseriesPoint,
  FunnelStage,
} from "@/lib/services/types";
import { getProspectMomentum } from "./actions";
import {
  formatChartDate,
  formatCount,
  formatDuration,
  formatLastViewed,
  formatRelative,
  hasEngagementData,
  type ActivityItem,
} from "./prospect-overview-stats";

export type { ActivityItem };

export const DEFAULT_PROSPECT_RANGE: AnalyticsTimeRange = "30d";

const RANGE_OPTIONS: { value: AnalyticsTimeRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export interface ProspectOverviewProps {
  prospectId: string;
  /** Prospect-level totals for the metric cards. */
  sessions: number;
  viewers: number;
  avgDurationSec: number;
  lastViewedAt: string | null;
  /** Server-rendered momentum series for the default range - no mount flash. */
  initialMomentum: DemoKindTimeseriesPoint[];
  /** All-time engagement funnel stages (rendered as-is, 3 today). */
  funnelStages: FunnelStage[];
  activity: ActivityItem[];
}

export function ProspectOverview({
  prospectId,
  sessions,
  viewers,
  avgDurationSec,
  lastViewedAt,
  initialMomentum,
  funnelStages,
  activity,
}: ProspectOverviewProps) {
  const [range, setRange] = useState<AnalyticsTimeRange>(DEFAULT_PROSPECT_RANGE);
  const [momentum, setMomentum] = useState<DemoKindTimeseriesPoint[]>(initialMomentum);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // The server already rendered the default range - skip the redundant fetch.
    if (range === DEFAULT_PROSPECT_RANGE) {
      setMomentum(initialMomentum);
      return;
    }
    let active = true;
    startTransition(() => {
      getProspectMomentum(prospectId, range).then((points) => {
        if (active) setMomentum(points);
      });
    });
    return () => {
      active = false;
    };
    // initialMomentum is a stable server-render input, not a reactive dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospectId, range]);

  const chartData = momentum.map((p) => ({
    x: new Date(`${p.date}T00:00:00Z`),
    y: p.sessions,
  }));

  const noData = !hasEngagementData(sessions);
  const metrics = [
    { icon: MousePointerClick, label: "Sessions", value: formatCount(sessions) },
    { icon: Users, label: "Unique Viewers", value: formatCount(viewers) },
    { icon: Clock, label: "Avg Duration", value: formatDuration(avgDurationSec) },
    { icon: Eye, label: "Last Viewed", value: formatLastViewed(lastViewedAt) },
  ];

  return (
    <div className="space-y-8">
      <section>
        {/* Below sm: compact 2x2 grid, tight padding + smaller number so the row does not eat the viewport before the content below. */}
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl bg-card px-3 py-2.5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center gap-1.5">
                <m.icon className="size-3.5 text-muted-foreground" />
                <span className="truncate text-[11px] font-medium text-muted-foreground">
                  {m.label}
                </span>
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {m.value}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <MetricCard key={m.label} icon={m.icon} label={m.label} value={m.value} />
          ))}
        </div>
      </section>

      {noData ? (
        // One purposeful getting-started panel replaces the momentum/funnel/activity empty shells.
        <EmptyState
          icon={Activity}
          title="No engagement yet"
          description="Share a demo link with this prospect - engagement shows up here as they view it."
          action={
            <Button asChild size="sm">
              <Link href={`/dashboard/prospects/${prospectId}/demos`}>Go to Demos</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Momentum - sessions over time, the visual centerpiece. */}
          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Momentum</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Sessions over time across this prospect&apos;s demos.
                </p>
              </div>
              <Select value={range} onValueChange={(v) => setRange(v as AnalyticsTimeRange)}>
                <SelectTrigger className="w-full sm:w-40 shrink-0" aria-label="Time range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div
              className={`rounded-xl border border-border bg-card p-4 transition-opacity ${
                isPending ? "opacity-60" : ""
              }`}
            >
              <AreaChart
                data={chartData}
                height={260}
                colorIndex={1}
                xFormat={formatChartDate}
                ariaLabel="Sessions over time"
              />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Depth - engagement funnel. */}
            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Engagement Funnel</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  How far viewers get, all time.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Viewed to authenticated
                </div>
                <EngagementFunnel stages={funnelStages} colorIndex={2} />
              </div>
            </section>

            {/* Recent Activity - newest sessions first. */}
            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  The latest views across this prospect&apos;s demos.
                </p>
              </div>

              {activity.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No Activity Yet"
                  description="Share a demo link with this prospect. Views show up here as they engage."
                />
              ) : (
                <ol className="divide-y divide-border rounded-xl border border-border bg-card">
                  {activity.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <p className="min-w-0 truncate text-sm text-foreground">
                        <span className="font-medium">{item.who}</span>
                        <span className="text-muted-foreground"> viewed {item.demoLabel}</span>
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelative(item.at)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
