"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, ChevronUp, Plus } from "lucide-react";
import {
  Button,
  EmptyState,
  Input,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/droplet-client";
import { ProspectIcon } from "@/components/shared/prospect-icon";
import { NewProspectDialog } from "@/components/shared/new-prospect-dialog";
import { displayHost } from "@/lib/display-host";
import { NO_AUTOFILL } from "@/lib/no-autofill";
import { setProspectFilter } from "@/lib/actions/scope";
import type { ProspectFilter } from "@/lib/prospect-scope";

export interface MyProspectRowView {
  id: string;
  name: string;
  domain: string | null;
  demos: number;
  sessions: number;
  viewers: number;
  lastViewedAt: string | null;
  updatedAt: string;
}

export interface MyProspectsProps {
  rows: MyProspectRowView[];
  canCreate: boolean;
  filter: ProspectFilter;
  isAdmin: boolean;
  onTeam: boolean;
}

type SortKey =
  | "name"
  | "demos"
  | "sessions"
  | "viewers"
  | "lastViewedAt"
  | "updatedAt";

function formatShortDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dateValue(iso: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function MyProspects({
  rows,
  canCreate,
  filter,
  isAdmin,
  onTeam,
}: MyProspectsProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? rows
      : rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            (r.domain ?? "").toLowerCase().includes(q),
        );
    const dir = sortDir === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "lastViewedAt")
        cmp = dateValue(a.lastViewedAt) - dateValue(b.lastViewedAt);
      else if (sortKey === "updatedAt")
        cmp = dateValue(a.updatedAt) - dateValue(b.updatedAt);
      else cmp = a[sortKey] - b[sortKey];
      return cmp * dir;
    });
  }, [rows, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Text sorts start ascending; counts and dates start descending.
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function selectFilter(value: ProspectFilter) {
    if (value === filter) return;
    startTransition(async () => {
      await setProspectFilter(value);
      router.refresh();
    });
  }

  const filterOptions: { value: ProspectFilter; label: string }[] = [
    { value: "mine", label: "My Prospects" },
    ...(onTeam
      ? [{ value: "team" as const, label: "Team Prospects" }]
      : []),
    ...(isAdmin ? [{ value: "all" as const, label: "All Prospects" }] : []),
  ];

  const sortIndicator = (key: SortKey) =>
    key === sortKey ? (
      sortDir === "asc" ? (
        <ChevronUp className="h-3 w-3" />
      ) : (
        <ChevronDown className="h-3 w-3" />
      )
    ) : null;

  const headerButton = (
    key: SortKey,
    label: string,
    align: "left" | "right",
  ) => (
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

  const segmented = filterOptions.length > 1 && (
    // flex-1 buttons fill the full-width mobile control; sm:flex-none reverts
    // to intrinsic width once the toolbar row has space to spare.
    <div className="flex w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-muted p-0.5 sm:inline-flex sm:w-auto">
      {filterOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => selectFilter(opt.value)}
          disabled={pending}
          aria-pressed={filter === opt.value}
          className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none ${
            filter === opt.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    // lg: this section fills the flex-1 slot handed to it by OverviewPage.
    // Heading + toolbar stay put (shrink-0); the row list below grows to
    // fill the rest, and only its table div (not this section, not the
    // page) scrolls - that's what keeps the sticky <thead> pinned to the
    // top of the table rather than the top of the page.
    <section className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="shrink-0">
        <h2 className="text-base font-semibold text-foreground">Prospects</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every account you are working, with at-a-glance engagement.
        </p>
      </div>

      <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {segmented}
          {rows.length > 0 && (
            <Input
              placeholder="Search prospects"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full sm:w-56"
              {...NO_AUTOFILL}
            />
          )}
        </div>
        {canCreate && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Prospect
          </Button>
        )}
      </div>

      {canCreate && (
        <NewProspectDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Prospects Yet"
          description="Create your first prospect to start building branded demos and share links."
        />
      ) : (
        <div className="lg:min-h-0 lg:flex-1">
          {/* Below sm: stacked cards, no fixed columns to collide or clip. */}
          <div className="flex flex-col gap-2 sm:hidden">
            {filtered.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/prospects/${r.id}`}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ProspectIcon domain={r.domain} name={r.name} size={32} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {r.name}
                    </p>
                    {r.domain && (
                      <p className="truncate text-xs text-muted-foreground">
                        {displayHost(r.domain)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Demos</span>
                    <span className="tabular-nums text-foreground">
                      {r.demos}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sessions</span>
                    <span className="tabular-nums text-foreground">
                      {r.sessions}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Viewers</span>
                    <span className="tabular-nums text-foreground">
                      {r.viewers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Updated</span>
                    <span className="text-foreground">
                      {formatShortDate(r.updatedAt)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Plain <table> in the scroll container itself: droplet's <Table>
              wraps the table in its own overflow-x-auto div, which becomes the
              sticky thead's scroll parent and stops it pinning. Rendering the
              table directly makes this div the offset parent, so the header
              stays put while rows scroll.
              lg: this div is the ONLY scrolling element on the page - it
              takes the full height handed down the flex chain and scrolls
              internally, so the sticky thead pins to its top rather than
              the page's. Below lg: no height/overflow constraint, so it
              lays out at natural height and the page scrolls normally. */}
          <div className="hidden rounded-xl border border-border bg-card sm:block lg:h-full lg:overflow-y-auto">
            <table
              data-slot="table"
              className="w-full caption-bottom text-sm table-fixed"
            >
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow>
                  <TableHead>
                    {headerButton("name", "Prospect", "left")}
                  </TableHead>
                  <TableHead className="w-[72px] text-right">
                    {headerButton("demos", "Demos", "right")}
                  </TableHead>
                  <TableHead className="w-[88px] text-right">
                    {headerButton("sessions", "Sessions", "right")}
                  </TableHead>
                  <TableHead className="w-[80px] text-right">
                    {headerButton("viewers", "Viewers", "right")}
                  </TableHead>
                  <TableHead className="w-[120px] text-right">
                    {headerButton("lastViewedAt", "Last Viewed", "right")}
                  </TableHead>
                  <TableHead className="w-[120px] text-right">
                    {headerButton("updatedAt", "Updated", "right")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  // Whole row navigates via next/link (prefetched); the stretched
                  // link in the first cell covers the row (tr is `relative`).
                  <TableRow key={r.id} className="relative cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/dashboard/prospects/${r.id}`}
                        className="flex items-center gap-3 before:absolute before:inset-0"
                      >
                        <ProspectIcon
                          domain={r.domain}
                          name={r.name}
                          size={32}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {r.name}
                          </p>
                          {r.domain && (
                            <p className="truncate text-xs text-muted-foreground">
                              {displayHost(r.domain)}
                            </p>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.demos}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.sessions}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.viewers}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatShortDate(r.lastViewedAt)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatShortDate(r.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
