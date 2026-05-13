"use client";

import { useMemo, useState } from "react";
import {
  useQuery,
  useQueryClient,
  useMutation,
  keepPreviousData,
} from "@tanstack/react-query";
import type { OrderState } from "@/lib/types/order-state";
import { formatCurrency } from "@/lib/format";

type Tab = "all" | "stuck" | "paid" | "in-flight" | "cancelled";

const TABS: Array<{ id: Tab; label: string; match: (s: OrderState["status"]) => boolean }> = [
  { id: "all", label: "All", match: () => true },
  { id: "stuck", label: "Stuck", match: (s) => s === "tx_confirmed" },
  { id: "paid", label: "Paid", match: (s) => s === "paid" },
  { id: "in-flight", label: "In flight", match: (s) => s === "awaiting_payment" || s === "checkout_ready" || s === "tx_in_flight" },
  { id: "cancelled", label: "Cancelled", match: (s) => s === "cancelled" || s === "tx_failed" || s === "checkout_expired" },
];

function fmtAmount(o: OrderState): { primary: string; sub: string | null } {
  const primary = formatCurrency(o.amountDue, o.currency);
  if (!o.amountDueUsd || !o.fxRate || o.fxSource === "identity") {
    return { primary, sub: null };
  }
  const usd = formatCurrency(o.amountDueUsd, "USD");
  return { primary, sub: `${usd} USD @ ${o.fxRate}` };
}

function truncate(s: string | undefined, max: number): string {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// Block explorer URL for the settlement tx. Every order settles to USDC on
// Base mainnet, so we always link against basescan.
function basescanTxUrl(txHash: string): string {
  return `https://basescan.org/tx/${txHash}`;
}

// Cvent doesn't expose a per-transaction deep link; the closest thing is the
// attendee's Orders & Payments page, which lists all their transactions. The
// `searchid` query param is a Cvent-side session id and is optional —
// omitting it lets Cvent generate a fresh one on landing.
function cventAttendeeOrdersUrl(eventId: string, attendeeId: string): string {
  const params = new URLSearchParams({
    evtstub: eventId,
    inviteestub: attendeeId,
  });
  return `https://app.cvent.com/subscribers/events2/Invitee/OrdersAndPayments?${params.toString()}`;
}

function relTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}

export default function AdminClient({
  initialOrders,
}: {
  initialOrders: OrderState[];
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [retryNotes, setRetryNotes] = useState<Record<string, string>>({});

  // Anchor initialData's age to render-time so React Query treats it as fresh
  // for `staleTime` seconds. Without this, initialData is implicitly stale
  // (updatedAt=0), which causes an immediate on-mount refetch on top of the
  // server's own listAllOrders — producing the "two requests on first load"
  // pattern. With staleTime below matching the poll interval, the tab also
  // stops firing piggyback requests on focus changes mid-poll.
  const [mountedAt] = useState(() => Date.now());
  const { data } = useQuery<{ orders: OrderState[] }>({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const r = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!r.ok) throw new Error(`status ${r.status}`);
      return r.json();
    },
    initialData: { orders: initialOrders },
    initialDataUpdatedAt: mountedAt,
    // Hold the prior page of data while the next poll is in flight so the
    // table doesn't flash empty on every 10s refetch or retry-triggered
    // invalidation.
    placeholderData: keepPreviousData,
    refetchInterval: 10_000,
    staleTime: 8_000,
    refetchOnWindowFocus: false,
  });

  const retry = useMutation({
    mutationFn: async (confirmation: string) => {
      const r = await fetch(`/api/admin/retry/${confirmation}`, {
        method: "POST",
      });
      const body = await r.json();
      return { status: r.status, body };
    },
    // Clear any stale note the moment the user clicks retry so the row
    // shows only the spinner while the sync call is in flight.
    onMutate: (confirmation) => {
      setRetryNotes((prev) => {
        if (!(confirmation in prev)) return prev;
        const next = { ...prev };
        delete next[confirmation];
        return next;
      });
    },
    onSuccess: async (res, confirmation) => {
      const note =
        res.status === 200
          ? "Retried: paid"
          : `Retry failed: ${res.body?.error ?? res.status}`;
      setRetryNotes((prev) => ({ ...prev, [confirmation]: note }));
      // Await the refetch so the row flips to its new status before the
      // spinner button rerenders; avoids a flash of stale "Retry" state.
      await qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err, confirmation) => {
      setRetryNotes((prev) => ({
        ...prev,
        [confirmation]: `Retry error: ${err instanceof Error ? err.message : String(err)}`,
      }));
    },
  });

  const tabDef = TABS.find((t) => t.id === tab) ?? TABS[0]!;
  const rows = useMemo(
    () => (data?.orders ?? []).filter((o) => tabDef.match(o.status)),
    [data, tabDef],
  );

  return (
    <main className="min-h-screen p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl">SPARK26 — Admin</h1>
        <form action="/api/admin/logout" method="post">
          <button type="submit" className="text-sm underline">Sign out</button>
        </form>
      </header>

      <nav className="flex gap-2 text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`rounded-md px-3 py-1 border ${tab === t.id ? "bg-[var(--color-blue)] text-white border-transparent" : "border-[var(--color-navy-line)]"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase opacity-70">
            <tr>
              <th className="p-2">Confirmation</th>
              <th className="p-2">Attendee</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Status</th>
              <th className="p-2">Cvent tx</th>
              <th className="p-2">Source tx</th>
              <th className="p-2">Attempts</th>
              <th className="p-2">Last error</th>
              <th className="p-2">Updated</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.confirmationNumber} className="border-t border-[var(--color-navy-line)]">
                <td className="p-2 font-mono">{o.confirmationNumber}</td>
                <td className="p-2">{o.attendeeName ?? "—"}</td>
                <td className="p-2">
                  {(() => {
                    const { primary, sub } = fmtAmount(o);
                    return (
                      <div className="flex flex-col">
                        <span>{primary}</span>
                        {sub && (
                          <span className="text-xs opacity-70">{sub}</span>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className="p-2">{o.status}</td>
                <td className="p-2 font-mono text-xs">
                  {o.cventTransactionId ? (
                    <a
                      href={cventAttendeeOrdersUrl(o.cventEventId, o.cventAttendeeId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-dotted hover:decoration-solid"
                      title={o.cventTransactionId}
                    >
                      {truncate(o.cventTransactionId, 12)}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2 font-mono text-xs">
                  {o.txHash ? (
                    <a
                      href={basescanTxUrl(o.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-dotted hover:decoration-solid"
                      title={o.txHash}
                    >
                      {truncate(o.txHash, 12)}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2">{o.cventPostAttempts ?? 0}</td>
                <td className="p-2 max-w-xs" title={o.cventPostLastError}>
                  {truncate(o.cventPostLastError, 60)}
                </td>
                <td className="p-2">{relTime(o.updatedAt)}</td>
                <td className="p-2">
                  {o.status === "tx_confirmed" ? (() => {
                    // `retry.variables` is the confirmation passed to
                    // mutate() for the in-flight call; scope the spinner to
                    // the clicked row only, not every tx_confirmed row.
                    const isThisRetrying =
                      retry.isPending &&
                      retry.variables === o.confirmationNumber;
                    return (
                      <button
                        type="button"
                        onClick={() => retry.mutate(o.confirmationNumber)}
                        disabled={retry.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-navy-line)] px-2 py-1 text-xs disabled:opacity-60"
                      >
                        {isThisRetrying && (
                          <span
                            aria-hidden
                            className="h-3 w-3 rounded-full border border-current border-t-transparent animate-spin"
                          />
                        )}
                        {isThisRetrying ? "Retrying…" : "Retry"}
                      </button>
                    );
                  })() : null}
                  {retryNotes[o.confirmationNumber] && (
                    <div className="mt-1 text-xs opacity-70">
                      {retryNotes[o.confirmationNumber]}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
