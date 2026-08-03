/**
 * Catalog funnel - presentational view of the demo-catalog landing funnel:
 * visits to the catalog itself, unique visitors, and which demos those
 * visitors go on to launch. Org-wide, no My/Team prospect scoping - see
 * `CatalogFunnel` (Task 1) for the read model this renders.
 */

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

export interface CatalogFunnelProps {
  data: CatalogFunnelData;
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
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
                <TableRow key={row.slug}>
                  <TableCell className="font-medium text-foreground">{row.slug}</TableCell>
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
