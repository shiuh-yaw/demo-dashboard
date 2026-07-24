"use client";

import { Building2, Activity, MousePointerClick, Users } from "lucide-react";
import { MetricCard } from "@/components/droplet-client";

export interface OverviewMetricsProps {
  prospects: number;
  activeThisWeek: number;
  sessions: number;
  viewers: number;
}

/** Compact GTM signal row above the prospect list. Values come from the analytics contract. */
export function OverviewMetrics({
  prospects,
  activeThisWeek,
  sessions,
  viewers,
}: OverviewMetricsProps) {
  const metrics = [
    { icon: Building2, label: "Prospects", value: prospects },
    { icon: Activity, label: "Active This Week", value: activeThisWeek },
    { icon: MousePointerClick, label: "Total Sessions", value: sessions },
    { icon: Users, label: "Total Viewers", value: viewers },
  ];

  return (
    <>
      {/* Below sm: compact 2x2 grid, tight padding + smaller number so the row does not eat the viewport before the list. */}
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
    </>
  );
}
