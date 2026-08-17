"use client";

/**
 * Admin control for the enrichment bulk backfill: sweeps historical sessions
 * that captured an email but never got enriched (the enrichment hook only
 * fires on a live `identify()`, so anything predating it stays blank).
 *
 * The run is domain-deduped server-side and bounded per click, so the summary
 * reports what was actually processed - re-run it when `scanned` comes back at
 * the cap.
 */

import { useState } from "react";
import { Building2, Sparkles } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
} from "@/components/droplet-client";
import { backfillEnrichmentAction } from "@/lib/actions/enrich-contact";
import {
  backfillProspectsAction,
  type ProspectBackfillResult,
} from "@/lib/actions/backfill-prospects";
import type { EnrichRunResult } from "@/lib/enrichment/backfill";

type State =
  | { kind: "idle" }
  | { kind: "done"; run: EnrichRunResult }
  | { kind: "unavailable" }
  | { kind: "error" };

export function EnrichmentBackfill() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [isPending, setIsPending] = useState(false);

  async function handleRun() {
    setIsPending(true);
    try {
      const result = await backfillEnrichmentAction();
      setState(
        result.status === "ok"
          ? { kind: "done", run: result.run }
          : { kind: "unavailable" },
      );
    } catch {
      setState({ kind: "error" });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company enrichment</CardTitle>
        <CardDescription>
          Resolve companies for past viewers who signed in with a work email but
          were never enriched. One lookup per distinct domain; already-enriched
          sessions are skipped.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleRun} disabled={isPending} variant="outline">
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="h-4 w-4" />
              Running...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Run backfill
            </span>
          )}
        </Button>

        {state.kind === "done" && <RunSummary run={state.run} />}
        {state.kind === "unavailable" && (
          <p className="text-sm text-muted-foreground">
            Enrichment is not configured - set ANTHROPIC_API_KEY to enable it.
          </p>
        )}
        {state.kind === "error" && (
          <p className="text-sm text-destructive">
            The backfill failed. Check the server logs and try again.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RunSummary({ run }: { run: EnrichRunResult }) {
  if (run.scanned === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing to do - every session with a captured email is already enriched.
      </p>
    );
  }

  const rows: [string, number][] = [
    ["Sessions scanned", run.scanned],
    ["Eligible (work email)", run.eligible],
    ["Domains looked up", run.domains],
    ["Sessions enriched", run.enriched],
    ["Domains unmatched", run.missed],
  ];

  return (
    <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 sm:justify-start">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium tabular-nums text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Gives every already-captured lead a company. The ingest path only creates a
 * prospect for leads arriving from now on, so this is what retrofits history.
 * Auto-created prospects land unowned in the Prospects "Unclaimed" queue.
 */
export function ProspectBackfill() {
  const [result, setResult] = useState<ProspectBackfillResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleRun() {
    setIsPending(true);
    setFailed(false);
    try {
      setResult(await backfillProspectsAction());
    } catch {
      setFailed(true);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prospects from leads</CardTitle>
        <CardDescription>
          Create a prospect for every past lead that signed in with a work
          email and has no company yet. One lookup per distinct domain;
          existing prospects on a domain are reused, not duplicated. New rows
          are unowned and appear under Prospects &rarr; Unclaimed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleRun} disabled={isPending} variant="outline">
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="h-4 w-4" />
              Running...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Create prospects
            </span>
          )}
        </Button>

        {result && (
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {(
              [
                ["Contacts scanned", result.scanned],
                ["On a work email", result.business],
                ["Distinct domains", result.domains],
                ["Already had a prospect", result.matched],
                ["Prospects created", result.created],
                ["Skipped (personal email)", result.skipped],
              ] as [string, number][]
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-4 sm:justify-start"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {failed && (
          <p className="text-sm text-destructive">
            The backfill failed. Check the server logs and try again.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
