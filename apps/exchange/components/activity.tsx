"use client";

import { useSession } from "@/lib/session/store";
import { clock, money, shortHash } from "@/lib/format";
import { SEPOLIA_EXPLORER } from "@/lib/backend/types";
import type { ActivityKind } from "@/lib/session/types";
import { Badge, Card, Eyebrow } from "@/components/primitives";

const ICON: Record<ActivityKind, string> = {
  signin: "→",
  "wallet-created": "✓",
  fund: "+",
  "earn-open": "%",
  transfer: "↗",
  "device-lost": "!",
  recovered: "↻",
  "external-linked": "⛓",
};

export function Activity({ compact = false }: { compact?: boolean }) {
  const { state } = useSession();
  const items = compact ? state.activity.slice(0, 5) : state.activity;
  return (
    <div className="rise">
      {!compact && (
        <>
          <Eyebrow className="mb-2">Activity</Eyebrow>
          <h1 className="text-2xl font-bold tracking-tight mb-6">Everything on this account</h1>
        </>
      )}
      <Card className="p-0 overflow-hidden">
        {items.length === 0 ? (
          <p className="p-6 text-[14px] text-muted">No activity yet.</p>
        ) : (
          <ul>
            {items.map((a) => (
              <li key={a.id} className="flex items-start gap-3.5 px-5 py-3.5 border-b border-line last:border-0">
                <span className={`mt-0.5 h-8 w-8 shrink-0 rounded-full grid place-items-center text-[13px] font-bold ${a.kind === "device-lost" ? "bg-down-2 text-down" : a.kind === "recovered" ? "bg-info-2 text-info" : "bg-ground text-ink-2"}`}>
                  {ICON[a.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[14px]">{a.title}</span>
                    {a.sponsored && <Badge tone="brand">Fee sponsored</Badge>}
                  </div>
                  {a.detail && <div className="text-[13px] text-muted mt-0.5">{a.detail}</div>}
                  {a.txHash && state.revealAddress && (
                    <a className="mono text-[11px] text-info hover:underline mt-1 inline-block" href={`${SEPOLIA_EXPLORER}/tx/${a.txHash}`} target="_blank" rel="noreferrer">
                      {shortHash(a.txHash)}
                    </a>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {typeof a.amount === "number" && (
                    <div className={`tnum font-semibold text-[14px] ${a.amount > 0 ? "text-up" : ""}`}>
                      {a.amount > 0 ? "+" : ""}
                      {money(a.amount)}
                    </div>
                  )}
                  <div className="text-[11px] text-muted tnum">{clock(a.at)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
