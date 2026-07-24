"use client";

/**
 * Demos home table (Phase GTM-07). One row per DemoConfig across all kinds,
 * joined to prospect + creator. Filters and search run client-side over the
 * already-scoped rows. Sessions/viewers read from the analytics stub; the
 * analytics drawer is a "coming soon" shell until Phase GTM-08.
 */

import { useMemo, useState } from "react";

import {
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/droplet-client";
import { ICON_ACTION } from "@/components/shared/icon-action";
import { THIN_SCROLLBAR } from "@/components/shared/thin-scrollbar";
import { Tooltip } from "@dynamic-demos/ui";
import { BarChart3 } from "lucide-react";
import { ProspectIcon } from "@/components/shared/prospect-icon";
import { ShareLinkButton } from "@/components/shared/share-link-button";
import type { DemoConfigKind } from "@/lib/services";

export interface DemosTableRowView {
  id: string;
  kind: DemoConfigKind;
  name: string | null;
  createdAt: string; // ISO
  prospect: { id: string; name: string; domain: string | null } | null;
  creator: { id: string; displayName: string | null; email: string } | null;
  summary: { sessions: number; viewers: number };
}

export interface DemosTableProps {
  rows: DemosTableRowView[];
  kinds: DemoConfigKind[];
  creators: { id: string; label: string }[];
  prospects: { id: string; name: string }[];
}

const ALL = "__all__";

function creatorLabel(row: DemosTableRowView): string {
  if (!row.creator) return "-";
  return row.creator.displayName ?? row.creator.email;
}

export function DemosTable({ rows, kinds, creators, prospects }: DemosTableProps) {
  const [kind, setKind] = useState<string>(ALL);
  const [creatorId, setCreatorId] = useState<string>(ALL);
  const [prospectId, setProspectId] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [drawerRow, setDrawerRow] = useState<DemosTableRowView | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind !== ALL && r.kind !== kind) return false;
      if (creatorId !== ALL && r.creator?.id !== creatorId) return false;
      if (prospectId !== ALL && r.prospect?.id !== prospectId) return false;
      if (q && !(r.prospect?.name.toLowerCase().includes(q) ?? false)) return false;
      return true;
    });
  }, [rows, kind, creatorId, prospectId, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search prospect name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
          aria-label="Search by prospect name"
        />
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-36" aria-label="Filter by template">
            <SelectValue placeholder="Template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All templates</SelectItem>
            {kinds.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={creatorId} onValueChange={setCreatorId}>
          <SelectTrigger className="w-40" aria-label="Filter by creator">
            <SelectValue placeholder="Creator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All creators</SelectItem>
            {creators.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={prospectId} onValueChange={setProspectId}>
          <SelectTrigger className="w-40" aria-label="Filter by prospect">
            <SelectValue placeholder="Prospect" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All prospects</SelectItem>
            {prospects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={`overflow-x-auto rounded-lg border border-border bg-card ${THIN_SCROLLBAR}`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prospect</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Viewers</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No demos match these filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.prospect ? (
                      <span className="flex items-center gap-2">
                        <ProspectIcon
                          domain={r.prospect.domain}
                          name={r.prospect.name}
                          size={20}
                        />
                        <span className="font-medium text-foreground">
                          {r.prospect.name}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Unbranded</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.kind}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{creatorLabel(r)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.summary.sessions}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.summary.viewers}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center justify-end gap-1">
                      <ShareLinkButton
                        demoConfigId={r.id}
                        boundProspect={
                          r.prospect
                            ? {
                                id: r.prospect.id,
                                name: r.prospect.name,
                                domain: r.prospect.domain,
                              }
                            : null
                        }
                      />
                      <Tooltip content="Analytics" position="top">
                        <button
                          type="button"
                          className={ICON_ACTION}
                          aria-label="Open analytics"
                          onClick={() => setDrawerRow(r)}
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={drawerRow !== null} onOpenChange={(open) => !open && setDrawerRow(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {drawerRow?.prospect?.name ?? "Demo"} - {drawerRow?.kind} analytics
            </SheetTitle>
            <SheetDescription>Engagement for this demo.</SheetDescription>
          </SheetHeader>
          <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-10 text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">
              Analytics coming soon
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sessions, viewers, and milestone events land here once a demo is live.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
