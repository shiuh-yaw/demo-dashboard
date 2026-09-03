"use client";

/**
 * Prospect demos table: one row per BUILT demo, sortable, for GTM
 * at-a-glance comparison (Sessions/Viewers/Avg time/Last seen/Reach). Un-
 * enabled demos never render a row - the Add Demo popover in the header is
 * the only place to create one. Row click drills into the demo instance
 * page, which owns the full per-demo detail (no inline expand here).
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Eye,
  Wallet,
  ArrowUpDown,
  Banknote,
  Plus,
  Loader2,
  Send,
  ChevronUp,
  ChevronDown,
  Layers,
  Info,
  TrendingUp,
  CreditCard,
  Workflow,
  Link2,
  Users,
  CircleCheck, Landmark } from "lucide-react";
import type { ProspectProfile } from "@/lib/types/dashboard";
import type { DemoSummary } from "@/lib/services";
import { createMissingDemos } from "@/lib/actions/prospects";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/droplet-client";
import { toastSuccess, toastError } from "@/lib/toast";
import { demoThemeUrl } from "@/lib/share-links/launch-url";
import type { DemoConfigKind } from "@/lib/services/types";
import { ShareLinkButton } from "@/components/shared/share-link-button";
import { Tooltip } from "@dynamic-demos/ui";
import { getDemoByKind } from "@/lib/landing/demos";
import {
  buildAddDemoCatalog,
  type AddDemoRow,
  type ProspectDemoType,
} from "./add-demo-catalog";
// Reuse the catalog's illustrated hero as a compact row thumbnail - imported only, public card unchanged.
import { OperatorDemoHero } from "@/components/demo-illustrations/demo-hero";
import { THIN_SCROLLBAR } from "@/components/shared/thin-scrollbar";

// Demo type - the resolved-demos key IS the DemoConfigKind now (no more
// "checkouts" plural alias); every built kind can render a row.
type DemoType = DemoConfigKind;

interface DemoConfig {
  type: DemoType;
  label: string;
  icon: LucideIcon;
  configRoute: string; // Dashboard route to edit config; "" when none exists.
}

const DEMO_CONFIGS = [
  { type: "earn", label: "Earn", icon: Banknote, configRoute: "/earns" },
  { type: "checkout", label: "Checkouts", icon: ArrowUpDown, configRoute: "/checkouts" },
  { type: "wallet", label: "Wallet", icon: Wallet, configRoute: "/wallets" },
  { type: "remittance", label: "Remittance", icon: Send, configRoute: "/remittance" },
  { type: "trade", label: "Trade", icon: TrendingUp, configRoute: "/trade" },
  { type: "visa-direct", label: "Liquidity", icon: CreditCard, configRoute: "/visa-direct" },
  { type: "flow", label: "Flow", icon: Workflow, configRoute: "" },
  { type: "card", label: "Card", icon: CreditCard, configRoute: "" },
  // No configRoute: like flow and card, connect's theme comes from the prospect
  // and apps/connections owns its config, so there is nothing to edit here.
  { type: "connections", label: "Connections", icon: Link2, configRoute: "" },
  // Same: apps/accounts owns its config and reads the theme through the
  // prospect. A kind missing from this list is created but never listed.
  { type: "accounts", label: "Accounts", icon: Users, configRoute: "" },
  { type: "exchange", label: "Exchange", icon: Landmark, configRoute: "/exchange" },
] as const satisfies readonly DemoConfig[];

/**
 * Compile-time guard: every prospect-bindable demo type needs a row above.
 * Accounts shipped without one - the demo was created, the toast said so, and
 * the table simply never listed it. This turns the next omission into a build
 * error instead of a phantom demo.
 */
type MissingDemoRow = Exclude<
  ProspectDemoType,
  (typeof DEMO_CONFIGS)[number]["type"]
>;
type AssertNever<T extends never> = T;
export type _EveryProspectDemoTypeHasARow = AssertNever<MissingDemoRow>;

function formatLastViewed(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Sort-key value for "Last seen"; missing/invalid dates sort as oldest.
function lastViewedValue(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

// Avg session duration -> "2m 34s" / "45s"; zero reads as "-".
function formatDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return "-";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatCount(n: number): string {
  return n > 0 ? String(n) : "-";
}

function formatReachPct(reach: number): string {
  return `${Math.round(reach * 100)}%`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** One illustrated catalog card inside the Add Demo dialog. */
function AddDemoCard({
  row,
  isCreatingDemo,
  onCreate,
}: {
  row: AddDemoRow;
  isCreatingDemo: string | null;
  onCreate: (type: ProspectDemoType) => void;
}) {
  const landingDemo = getDemoByKind(row.kind);
  const added = row.status === "added";
  const creating = isCreatingDemo === row.demoType;

  const illustration = (
    <div className="w-28 shrink-0 self-stretch overflow-hidden">
      {landingDemo ? (
        <OperatorDemoHero
          demo={landingDemo}
          className="h-full w-full"
          illustrationClassName="scale-[0.5]"
        />
      ) : (
        <div className="h-full w-full bg-muted" />
      )}
    </div>
  );

  const body = (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3 text-left">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {row.name}
        </p>
        {added && (
          <CircleCheck
            className="h-4 w-4 shrink-0"
            style={{ color: "var(--chart-2)" }}
            aria-label="Added"
          />
        )}
        {creating && (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">{row.tagline}</p>
    </div>
  );

  // Added demos are informational; creatable ones make the whole card the
  // button (no separate Create control).
  if (added) {
    return (
      <div className="flex items-stretch overflow-hidden rounded-xl border border-border bg-card opacity-70">
        {illustration}
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={isCreatingDemo !== null}
      onClick={() => onCreate(row.demoType)}
      aria-label={`Create ${row.name} demo`}
      className="flex items-stretch overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-primary hover:bg-muted/50 focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      {illustration}
      {body}
    </button>
  );
}

/**
 * The "Add Demo" trigger + illustrated catalog dialog. Owns its OWN open state
 * so it can be rendered independently in more than one place (page header AND
 * the empty state) without two instances fighting over one shared `open`.
 */
function AddDemoDialog({
  catalogRows,
  isCreatingDemo,
  onCreate,
}: {
  catalogRows: AddDemoRow[];
  isCreatingDemo: string | null;
  onCreate: (type: ProspectDemoType) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Demo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a demo</DialogTitle>
          <DialogDescription>
            Pick a demo to build for this prospect. Each one gets its own
            branded, shareable link.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div
            className={`grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 ${THIN_SCROLLBAR}`}
          >
            {catalogRows.map((row) => (
              <AddDemoCard
                key={row.kind}
                row={row}
                isCreatingDemo={isCreatingDemo}
                onCreate={onCreate}
              />
            ))}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

// One built demo, flattened for the table + its sort comparators.
interface DemoRow {
  type: DemoType;
  configId: string;
  label: string;
  icon: LucideIcon;
  url: string | null;
  sessions: number;
  viewers: number;
  avgDurationSec: number;
  lastViewedAt: string | null;
  reach: number;
}

type SortKey =
  | "name"
  | "sessions"
  | "viewers"
  | "avgDurationSec"
  | "lastViewedAt"
  | "reach";

interface ProspectDemosProps {
  profile: ProspectProfile;
  /** Per-demo engagement, keyed by demo config id. Zeros until data exists. */
  demoStats?: Record<string, DemoSummary>;
  /** Per-demo daily session counts, keyed by config id; empty until data exists. */
  demoTrends?: Record<string, number[]>;
  /** Per-demo funnel completion (last stage / first stage), keyed by config id; 0..1. */
  demoReach?: Record<string, number>;
}

export function ProspectDemos({
  profile: initialProfile,
  demoStats = {},
  demoReach = {},
}: ProspectDemosProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [isCreatingDemo, setIsCreatingDemo] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("sessions");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // All demo apps share the URL contract `<baseUrl>/?theme=<configId>`; the
  // app middleware resolves the prospect from the theme query (or cookie).
  // `demoThemeUrl` returns "" when the kind has no known base URL (e.g.
  // flow, which has no dashboard-facing catalog entry) - normalize to null.
  function getDemoUrl(config: DemoConfig): string | null {
    const demoId = profile.demos[config.type];
    if (!demoId) return null;
    return demoThemeUrl(config.type, demoId) || null;
  }

  async function handleCreateDemo(type: ProspectDemoType) {
    setIsCreatingDemo(type);
    try {
      const result = await createMissingDemos(profile.id, { [type]: true });
      if (result.success) {
        setProfile(result.data);
        toastSuccess(`${capitalize(type)} Demo Created`);
      } else {
        toastError(result.error || `Failed to create ${type} demo`);
      }
    } catch (err) {
      toastError(`Failed to create ${type} demo`);
      console.error(err);
    } finally {
      setIsCreatingDemo(null);
    }
  }

  const catalogRows = buildAddDemoCatalog(profile.demos);

  // Only built demos become rows - un-enabled kinds never render (product rule).
  const rows: DemoRow[] = useMemo(() => {
    return DEMO_CONFIGS.filter((config) => Boolean(profile.demos[config.type])).map(
      (config) => {
        const demoId = profile.demos[config.type] as string;
        const stats = demoStats[demoId];
        return {
          type: config.type,
          configId: demoId,
          label: config.label,
          icon: config.icon,
          url: getDemoUrl(config),
          sessions: stats?.sessions ?? 0,
          viewers: stats?.viewers ?? 0,
          avgDurationSec: stats?.avgDurationSec ?? 0,
          lastViewedAt: stats?.lastViewedAt ?? null,
          reach: demoReach[demoId] ?? 0,
        };
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.demos, demoStats, demoReach]);

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.label.localeCompare(b.label);
      else if (sortKey === "lastViewedAt")
        cmp = lastViewedValue(a.lastViewedAt) - lastViewedValue(b.lastViewedAt);
      else cmp = a[sortKey] - b[sortKey];
      return cmp * dir;
    });
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Text sorts start ascending; counts/dates start descending.
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLElement>,
    configId: string,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    router.push(`/dashboard/prospects/${profile.id}/demos/${configId}`);
  }

  const sortIndicator = (key: SortKey) =>
    key === sortKey ? (
      sortDir === "asc" ? (
        <ChevronUp className="h-3 w-3" />
      ) : (
        <ChevronDown className="h-3 w-3" />
      )
    ) : null;

  function headerButton(key: SortKey, label: string, align: "left" | "right") {
    return (
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={`inline-flex items-center gap-1 outline-none transition-colors hover:text-foreground ${
          align === "right" ? "flex-row-reverse" : ""
        } ${key === sortKey ? "text-foreground" : ""}`}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {sortIndicator(key)}
      </button>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Demos</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Every demo built for this prospect. Share a link or preview the
            branded theme.
          </p>
        </div>
        <AddDemoDialog
          catalogRows={catalogRows}
          isCreatingDemo={isCreatingDemo}
          onCreate={handleCreateDemo}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No demos yet"
          description="Add a demo to start sharing links and tracking engagement for this prospect."
          action={
            <AddDemoDialog
              catalogRows={catalogRows}
              isCreatingDemo={isCreatingDemo}
              onCreate={handleCreateDemo}
            />
          }
        />
      ) : (
        <>
          {/* Mobile: stacked cards - a wide comparison table cannot fit a phone. */}
          <div className="space-y-2 md:hidden">
            {sortedRows.map((row) => {
              const Icon = row.icon;
              const landingDemo = getDemoByKind(row.type);
              return (
                <div
                  key={row.type}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${row.label} demo`}
                  onClick={() =>
                    router.push(`/dashboard/prospects/${profile.id}/demos/${row.configId}`)
                  }
                  onKeyDown={(event) => handleRowKeyDown(event, row.configId)}
                  className="flex cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  {/* Illustration fills the left column, content sits beside it. */}
                  <div className="w-20 shrink-0 self-stretch overflow-hidden">
                    {landingDemo ? (
                      <OperatorDemoHero
                        demo={landingDemo}
                        className="h-full w-full"
                        illustrationClassName="scale-[0.4]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 p-3">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate font-medium text-foreground">
                        {row.label}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatLastViewed(row.lastViewedAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.sessions > 0 || row.viewers > 0
                        ? `${row.sessions} sessions · ${row.viewers} viewers · ${formatDuration(row.avgDurationSec)} avg · ${formatReachPct(row.reach)} reach`
                        : "No sessions yet"}
                    </p>
                    <div
                      className="mt-3 flex gap-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <a
                          href={row.url ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Preview ${row.label} demo`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </a>
                      </Button>
                      <ShareLinkButton
                        trigger="button"
                        variant="primary"
                        label="Share"
                        demoConfigId={row.configId}
                        boundProspect={{
                          id: profile.id,
                          name: profile.name,
                          domain: profile.companyUrl,
                        }}
                        className="flex-1 [&>button]:w-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: the sortable comparison table. */}
          <div
            className={`hidden overflow-x-auto rounded-xl border border-border bg-card md:block ${THIN_SCROLLBAR}`}
          >
          <table data-slot="table" className="w-full min-w-[860px] caption-bottom text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>{headerButton("name", "Demo", "left")}</TableHead>
                <TableHead className="text-right">
                  {headerButton("sessions", "Sessions", "right")}
                </TableHead>
                <TableHead className="text-right">
                  {headerButton("viewers", "Viewers", "right")}
                </TableHead>
                <TableHead className="text-right">
                  {headerButton("avgDurationSec", "Avg time", "right")}
                </TableHead>
                <TableHead className="text-right">
                  {headerButton("lastViewedAt", "Last seen", "right")}
                </TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center justify-end gap-1">
                    {headerButton("reach", "Reach", "right")}
                    <Tooltip
                      content="Share of viewers who reached the final step (authenticated)."
                      position="top"
                    >
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </Tooltip>
                  </span>
                </TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => {
                const Icon = row.icon;
                const landingDemo = getDemoByKind(row.type);
                return (
                  <TableRow
                    key={row.type}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${row.label} demo`}
                    onClick={() =>
                      router.push(`/dashboard/prospects/${profile.id}/demos/${row.configId}`)
                    }
                    onKeyDown={(event) => handleRowKeyDown(event, row.configId)}
                    className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  >
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-8 w-12 shrink-0 overflow-hidden rounded-md">
                          {landingDemo ? (
                            <OperatorDemoHero
                              demo={landingDemo}
                              className="h-full w-full"
                              illustrationClassName="scale-[0.2]"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="truncate font-medium text-foreground">
                          {row.label}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {formatCount(row.sessions)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {formatCount(row.viewers)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                      {formatDuration(row.avgDurationSec)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                      {formatLastViewed(row.lastViewedAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-foreground/[0.08]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round(row.reach * 100)}%`,
                              minWidth: row.reach > 0 ? "0.25rem" : 0,
                              backgroundColor: "var(--chart-2)",
                            }}
                          />
                        </div>
                        <span className="w-9 shrink-0 tabular-nums text-muted-foreground">
                          {formatReachPct(row.reach)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {/* Preview then Share - primary (Share) sits last, matching the instance header. */}
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={row.url ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Preview ${row.label} demo`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Preview
                          </a>
                        </Button>
                        <ShareLinkButton
                          trigger="button"
                          variant="primary"
                          label="Share"
                          demoConfigId={row.configId}
                          boundProspect={{
                            id: profile.id,
                            name: profile.name,
                            domain: profile.companyUrl,
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </table>
          </div>
        </>
      )}
    </section>
  );
}
