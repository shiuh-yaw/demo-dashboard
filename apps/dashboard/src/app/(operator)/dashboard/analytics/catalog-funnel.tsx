/**
 * Catalog funnel - presentational view of the demo-catalog landing funnel:
 * visits to the catalog itself, unique visitors, and which demos those
 * visitors go on to launch. Org-wide, no My/Team prospect scoping - see
 * `CatalogFunnel` (Task 1) for the read model this renders.
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  MetricCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/droplet-client";
import type { CatalogFunnel as CatalogFunnelData } from "@/lib/services/types";
import { getDemoBySlug } from "@/lib/landing/demos";

export interface CatalogFunnelProps {
  data: CatalogFunnelData;
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** Friendly display name for a launched demo, falling back to the raw slug
 *  (e.g. a demo since removed from the landing catalog). */
function demoLabel(slug: string): string {
  return getDemoBySlug(slug)?.name ?? slug;
}

export function CatalogFunnel({ data }: CatalogFunnelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard label="Visits" value={data.visits} />
        <MetricCard label="Unique visitors" value={data.uniqueVisitors} />
      </div>

      {data.byDemo.length === 0 ? (
        <p className="text-sm text-muted-foreground">No catalog launches yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Demo</TableHead>
                <TableHead className="text-right">Launches</TableHead>
                <TableHead className="text-right">Launch rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byDemo.map((row) => (
                <TableRow
                  key={row.slug}
                  className="group relative cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <TableCell className="font-medium text-foreground">
                    {/* Stretched link: the anchor stays accessible, but its
                        hit area (after:inset-0) covers the whole row. */}
                    <Link
                      href={`/dashboard/analytics/catalog/${row.slug}`}
                      className="inline-flex items-center gap-1 after:absolute after:inset-0 after:content-[''] group-hover:text-primary group-hover:underline"
                    >
                      {demoLabel(row.slug)}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.launches}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatRate(row.launchRate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
