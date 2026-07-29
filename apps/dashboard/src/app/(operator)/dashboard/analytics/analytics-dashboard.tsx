"use client";

/**
 * Org/team analytics roll-up: all demos combined. A momentum hero (sessions
 * over time), an engagement funnel (Depth), and a per-kind comparison bar
 * (which demos land best). Client component: owns the range filter, lucide
 * icons, and the charts package. Every read is counts-only and scope-narrowed
 * server-side (see ./actions + ./org-scope); no per-prospect identity here.
 */

import { useEffect, useState, useTransition } from "react";
import { Activity, BarChart3, LayoutGrid } from "lucide-react";
import { AreaChart, BarChart } from "@dynamic-demos/charts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/droplet-client";
import { EngagementFunnel } from "@/components/analytics/engagement-funnel";
import type {
  AnalyticsTimeRange,
  DemoConfigKind,
  DemoKindTimeseriesPoint,
  FunnelStage,
  OrgDemoKindBreakdownRow,
} from "@/lib/services/types";
import { ORG_DEMO_FILTER_ALL, type OrgDemoFilter } from "@/lib/analytics/org-filter";
import { getOrgAnalyticsForRange } from "./actions";

export const DEFAULT_ORG_RANGE: AnalyticsTimeRange = "7d";

const RANGE_OPTIONS: { value: AnalyticsTimeRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const KIND_LABEL: Record<DemoConfigKind, string> = {
  earn: "Earn",
  wallet: "Wallet",
  trade: "Trade",
  "visa-direct": "Fireblocks MTLco",
  checkout: "Checkouts",
  remittance: "Remittance",
  flow: "Flow",
  card: "Card",
};

function formatChartDate(x: Date | number | string): string {
  const d = x instanceof Date ? x : new Date(x);
  if (Number.isNaN(d.getTime())) return String(x);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatSessions(value: number): string {
  return `${value.toLocaleString()} session${value === 1 ? "" : "s"}`;
}

export interface AnalyticsDashboardProps {
  initialTimeseries: DemoKindTimeseriesPoint[];
  funnelStages: FunnelStage[];
  initialBreakdown: OrgDemoKindBreakdownRow[];
  /** Demo kinds present in scope - the demo filter's options. */
  kinds: DemoConfigKind[];
}

export function AnalyticsDashboard({
  initialTimeseries,
  funnelStages,
  initialBreakdown,
  kinds,
}: AnalyticsDashboardProps) {
  const [range, setRange] = useState<AnalyticsTimeRange>(DEFAULT_ORG_RANGE);
  const [demoFilter, setDemoFilter] = useState<OrgDemoFilter>(ORG_DEMO_FILTER_ALL);
  const [timeseries, setTimeseries] =
    useState<DemoKindTimeseriesPoint[]>(initialTimeseries);
  const [funnel, setFunnel] = useState<FunnelStage[]>(funnelStages);
  const [breakdown, setBreakdown] =
    useState<OrgDemoKindBreakdownRow[]>(initialBreakdown);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // The server already rendered the default range + all-demos combo - skip
    // the redundant fetch.
    if (range === DEFAULT_ORG_RANGE && demoFilter === ORG_DEMO_FILTER_ALL) {
      setTimeseries(initialTimeseries);
      setFunnel(funnelStages);
      setBreakdown(initialBreakdown);
      return;
    }
    let active = true;
    startTransition(() => {
      getOrgAnalyticsForRange(range, demoFilter).then((data) => {
        if (!active) return;
        setTimeseries(data.timeseries);
        setFunnel(data.funnel);
        setBreakdown(data.breakdown);
      });
    });
    return () => {
      active = false;
    };
    // initial* / funnelStages are stable server-render inputs, not deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, demoFilter]);

  const chartData = timeseries.map((p) => ({
    x: new Date(`${p.date}T00:00:00Z`),
    y: p.sessions,
  }));

  // Highest-engagement demos first; kinds with no sessions sink to the bottom.
  const comparison = [...breakdown]
    .sort((a, b) => b.sessions - a.sessions)
    .map((r) => ({ label: KIND_LABEL[r.kind] ?? r.kind, value: r.sessions }));
  const comparisonHeight = Math.min(320, Math.max(180, comparison.length * 48));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={demoFilter}
            onValueChange={(v) => setDemoFilter(v as OrgDemoFilter)}
          >
            <SelectTrigger className="w-full sm:w-44 shrink-0" aria-label="Demo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ORG_DEMO_FILTER_ALL}>All demos</SelectItem>
              {kinds.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {KIND_LABEL[kind] ?? kind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>

      <div className={`space-y-6 transition-opacity ${isPending ? "opacity-60" : ""}`}>
        {/* Momentum - full-width sessions-over-time hero. */}
        <div className="rounded-xl border border-border-divider bg-card p-4">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            Sessions Over Time
          </h3>
          <AreaChart
            data={chartData}
            height={280}
            colorIndex={1}
            xFormat={formatChartDate}
            ariaLabel="Sessions over time"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Depth - org engagement funnel (all time). */}
          <div className="rounded-xl border border-border-divider bg-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Engagement Funnel - All Time
            </h3>
            <EngagementFunnel stages={funnel} colorIndex={2} />
          </div>

          {/* Comparison - which demo kinds land best. */}
          <div className="rounded-xl border border-border-divider bg-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <LayoutGrid className="h-3.5 w-3.5" />
              Sessions By Demo
            </h3>
            <BarChart
              data={comparison}
              height={comparisonHeight}
              orientation="horizontal"
              colorIndex={3}
              valueFormat={formatSessions}
              ariaLabel="Sessions by demo kind"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
