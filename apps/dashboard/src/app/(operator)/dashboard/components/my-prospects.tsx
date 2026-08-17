"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronDown, ChevronUp, Inbox, Plus } from "lucide-react";
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
import { InfiniteScrollSentinel } from "@/components/shared/infinite-scroll-sentinel";
import { THIN_SCROLLBAR } from "@/components/shared/thin-scrollbar";
import { displayHost } from "@/lib/display-host";
import { NO_AUTOFILL } from "@/lib/no-autofill";
import { setProspectFilter } from "@/lib/actions/scope";
import { claimProspect, listOverviewRowsPage } from "@/lib/actions/prospects";
import { useInfiniteList } from "@/lib/query/use-infinite-list";
import { keys } from "@/lib/query/keys";
import type { OverviewProspectRow } from "@/lib/overview-row";
import type { Page } from "@/lib/services/types";
import type { ProspectFilter, ProspectScope } from "@/lib/prospect-scope";

export interface MyProspectsProps {
  /** SSR-seeded first page of overview rows; the infinite list takes it from here with no initial fetch. */
  initialPage: Page<OverviewProspectRow>;
  /** The enforced scope for `initialPage` - keys the query cache and is echoed on every "load more" fetch. */
  scope: ProspectScope;
  canCreate: boolean;
  filter: ProspectFilter;
  isAdmin: boolean;
  onTeam: boolean;
  /** Unclaimed inbound rows - a bounded, unpaginated set on its own tab. */
  inbound: OverviewProspectRow[];
  /** Claiming is a mutation; VIEWERs get the tab read-only. */
  canClaim: boolean;
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
  initialPage,
  scope,
  canCreate,
  filter,
  isAdmin,
  onTeam,
  inbound,
  canClaim,
}: MyProspectsProps) {
  const router = useRouter();
  // ?inbound=1 deep-links the queue - the top-bar badge points here.
  const searchParams = useSearchParams();
  const [onInbound, setOnInbound] = useState(
    searchParams.get("inbound") === "1",
  );
  const [inboundRows, setInboundRows] = useState(inbound);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const {
    items: rows,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteList<OverviewProspectRow>({
    queryKey: keys.overviewProspects.list({ scope }),
    fetchPage: (cursor) => listOverviewRowsPage(scope, cursor),
    initialPage,
  });
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  // The active tab decides the row source: the scoped, paginated list or the
  // bounded inbound queue. Search and sort apply to whichever is showing.
  const activeRows = onInbound ? inboundRows : rows;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? activeRows
      : activeRows.filter(
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
  }, [activeRows, query, sortKey, sortDir]);

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
    setOnInbound(false);
    if (value === filter) return;
    startTransition(async () => {
      await setProspectFilter(value);
      router.refresh();
    });
  }

  async function handleClaim(id: string) {
    if (claimingId) return;
    setClaimingId(id);
    setClaimError(null);
    try {
      const result = await claimProspect(id);
      if (result.success) {
        // It has an owner now, so it leaves the queue and joins the scoped
        // list - which only a server round-trip can produce.
        setInboundRows((prev) => prev.filter((r) => r.id !== id));
        router.refresh();
      } else {
        setClaimError(result.error);
      }
    } catch {
      setClaimError("Failed to claim prospect");
    } finally {
      setClaimingId(null);
    }
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

  // Kept visible while the tab is open even after the last row is claimed,
  // so claiming the final inbound company doesn't yank the tab out from
  // under the click.
  const showInboundTab = inboundRows.length > 0 || onInbound;

  const inboundTab = showInboundTab && (
    <button
      type="button"
      onClick={() => setOnInbound(true)}
      aria-pressed={onInbound}
      className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none ${
        onInbound
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      Inbound{inboundRows.length > 0 && ` (${inboundRows.length})`}
    </button>
  );

  const segmented = (filterOptions.length > 1 || showInboundTab) && (
    // flex-1 buttons fill the full-width mobile control; sm:flex-none reverts
    // to intrinsic width once the toolbar row has space to spare.
    <div className="flex w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-muted p-0.5 sm:inline-flex sm:w-auto">
      {filterOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => selectFilter(opt.value)}
          disabled={pending}
          aria-pressed={!onInbound && filter === opt.value}
          className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none ${
            !onInbound && filter === opt.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
      {inboundTab}
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
          {onInbound
            ? "Companies that signed into a demo with a work email. Nobody owns these yet."
            : "Every account you are working, with at-a-glance engagement."}
        </p>
      </div>

      <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {segmented}
          {activeRows.length > 0 && (
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

      {claimError && (
        <p className="shrink-0 text-xs text-destructive">{claimError}</p>
      )}

      {activeRows.length === 0 ? (
        onInbound ? (
          <EmptyState
            icon={Inbox}
            title="No inbound companies waiting"
            description="When someone signs into a demo with a work email, the company lands here for anyone to claim."
          />
        ) : (
          <EmptyState
            icon={Building2}
            title="No Prospects Yet"
            description="Create your first prospect to start building branded demos and share links."
          />
        )
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
                {onInbound && canClaim && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={claimingId === r.id}
                    // Nested in the card's link - claiming must not navigate.
                    onClick={(e) => {
                      e.preventDefault();
                      void handleClaim(r.id);
                    }}
                    aria-label={`Claim ${r.name}`}
                  >
                    {claimingId === r.id ? "Claiming..." : "Claim"}
                  </Button>
                )}
              </Link>
            ))}
            {!onInbound && hasNextPage && (
              <InfiniteScrollSentinel
                onReach={fetchNextPage}
                disabled={isFetchingNextPage}
              />
            )}
            {isFetchingNextPage && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                Loading more...
              </p>
            )}
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
          <div className={`hidden rounded-xl border border-border bg-card sm:block lg:h-full lg:overflow-y-auto ${THIN_SCROLLBAR}`}>
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
                  {onInbound && canClaim && (
                    // Sized for "Claiming...", not "Claim" - the label grows
                    // mid-click and the narrower column clipped it.
                    <TableHead className="w-[132px] text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  )}
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
                    {onInbound && canClaim && (
                      // z-10: the row-wide stretched link would otherwise sit
                      // over this button and swallow the click.
                      <TableCell className="relative z-10 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={claimingId === r.id}
                          onClick={() => void handleClaim(r.id)}
                          aria-label={`Claim ${r.name}`}
                          // Fixed width so the row does not reflow when the
                          // label swaps to "Claiming...".
                          className="w-[104px] justify-center whitespace-nowrap"
                        >
                          {claimingId === r.id ? "Claiming..." : "Claim"}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </table>
            {!onInbound && hasNextPage && (
              <InfiniteScrollSentinel
                onReach={fetchNextPage}
                disabled={isFetchingNextPage}
              />
            )}
            {isFetchingNextPage && (
              <p className="py-3 text-center text-xs text-muted-foreground">
                Loading more...
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
