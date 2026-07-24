/**
 * Route-loading skeleton pieces, built on droplet's `Skeleton` primitive.
 * Compose these into route-specific `loading.tsx` files so each fallback
 * mirrors that page's real layout - never a generic full-page spinner.
 */

import { Skeleton } from "@/components/droplet-client";

/** Metric-cards row: mirrors the 2x2-mobile / 4-col-desktop card grid used
 * across Overview/Analytics pages (OverviewMetrics, ProspectOverview, etc). */
export function MetricCardsSkeleton({ count = 4 }: { count?: number }) {
  const items = Array.from({ length: count });
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:hidden">
        {items.map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-card px-3 py-2.5 shadow-[var(--shadow-card)]"
          >
            <Skeleton className="h-3 w-14" />
            <Skeleton className="mt-2 h-5 w-10" />
          </div>
        ))}
      </div>
      <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {items.map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>
    </>
  );
}

/** Chart-shaped placeholder card - momentum/area-chart blocks. */
export function ChartCardSkeleton({
  heightClassName = "h-[260px]",
}: {
  heightClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Skeleton className={`w-full ${heightClassName}`} />
    </div>
  );
}

/** Funnel-shaped placeholder card - a handful of descending bars. */
export function FunnelCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Skeleton className="mb-3 h-3 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-8 w-3/5" />
      </div>
    </div>
  );
}

/** Table-shaped placeholder card - header row + N body rows. */
export function TableCardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border-divider px-4 py-3">
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Settings-form placeholder - mirrors the SettingsSection two-column rail
 * (title/description left, fields right) used by prospect Settings, Profile,
 * and Admin, so their loading fallback is not the Overview chart layout. */
export function SettingsSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div>
      {Array.from({ length: sections }).map((_, i) => (
        <div
          key={i}
          className="grid gap-x-8 gap-y-4 border-b border-border-divider py-8 first-of-type:pt-0 last-of-type:border-b-0 md:grid-cols-[280px_1fr]"
        >
          <div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-48" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Page title + subtitle placeholder - used only where the real copy isn't
 * static (skip this and render the literal heading when the copy is fixed). */
export function PageHeaderSkeleton() {
  return (
    <div>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 h-4 w-72" />
    </div>
  );
}

/** One `Section`/`Field` card - title bar + N stacked label+input placeholders.
 * Mirrors `demo-config-editor.tsx`'s form-card shape (Basic Info, Appearance,
 * kind-specific fields). */
export function FormCardSkeleton({ fieldCount = 2 }: { fieldCount?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <Skeleton className="mb-3 h-4 w-24" />
      <div className="space-y-3">
        {Array.from({ length: fieldCount }).map((_, i) => (
          <div key={i}>
            <Skeleton className="mb-1 h-3 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Standalone `DemoConfigEditor` shell - back/name/actions header, then the
 * Basic Info, Appearance, and kind-fields cards. Shared by the five unbound
 * per-kind editor routes (earns/wallets/remittance/trade/visa-direct - not
 * checkouts, whose `[id]` route is the OverviewTab, not this editor). */
export function DemoEditorSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>
      <div className="max-w-xl space-y-5">
        <FormCardSkeleton fieldCount={2} />
        <FormCardSkeleton fieldCount={4} />
        <FormCardSkeleton fieldCount={2} />
      </div>
    </div>
  );
}

/** Demo-kind list shell - literal title (static copy, no fetch) plus a "New X"
 * action placeholder, then the config table. Shared by the six demo-kind list
 * routes (checkouts/earns/wallets/remittance/trade/visa-direct). */
export function DemoListSkeleton({ title }: { title: string }) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
      <TableCardSkeleton rows={5} />
    </div>
  );
}
