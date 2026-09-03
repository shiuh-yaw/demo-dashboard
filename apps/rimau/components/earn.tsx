"use client";

import { useState } from "react";
import { useSession } from "@/lib/session/store";
import { money, num, relTime } from "@/lib/format";
import { APY } from "@/lib/backend/sim";
import { Badge, Button, Card, Eyebrow } from "@/components/primitives";
import { EarnSheet } from "@/components/sheets/earn-sheet";
import type { Position } from "@/lib/session/types";

const PROTOCOLS: { name: Position["protocol"]; blurb: string }[] = [
  { name: "Aave", blurb: "Blue-chip lending market. Deep USDC liquidity." },
  { name: "Morpho", blurb: "Optimised lending vaults, curated risk." },
  { name: "Sentora", blurb: "Institutional DeFi yield, screened counterparties." },
];

/** Beat 2. Yield lives next to the exchange balance, not in a separate crypto tab. */
export function Earn() {
  const { state } = useSession();
  const [open, setOpen] = useState<Position["protocol"] | null>(null);
  const inEarn = state.positions.reduce((s, p) => s + p.principal, 0);

  return (
    <div className="rise">
      <Eyebrow className="mb-2">Earn</Eyebrow>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Put idle dollars to work</h1>
        <div className="text-right">
          <div className="text-[12px] text-muted">In Earn</div>
          <div className="tnum text-xl font-bold">{money(inEarn)}</div>
        </div>
      </div>

      {state.positions.length > 0 && (
        <Card className="p-0 overflow-hidden mb-6">
          <div className="px-5 py-3.5 border-b border-line font-semibold">Your positions</div>
          <ul>
            {state.positions.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-line last:border-0">
                <span className="h-9 w-9 rounded-full bg-up-2 text-up grid place-items-center font-bold">%</span>
                <div className="flex-1">
                  <div className="font-semibold text-[14px]">{p.protocol} · USDC</div>
                  <div className="text-[12px] text-muted">Opened {relTime(p.openedAt)} · from your Rimau account, signed on your device</div>
                </div>
                <div className="text-right">
                  <div className="tnum font-semibold">{money(p.principal)}</div>
                  <div className="tnum text-[12px] text-up">{num(p.apy)}% APY</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {PROTOCOLS.map((p) => (
          <Card key={p.name} className="flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[16px]">{p.name}</h2>
              <Badge tone="up">{num(APY[p.name])}% APY</Badge>
            </div>
            <p className="text-[13px] text-muted mt-2 flex-1">{p.blurb}</p>
            <div className="mt-4 text-[12px] text-muted">USDC · Ethereum</div>
            <Button className="mt-3" onClick={() => setOpen(p.name)}>
              Deposit
            </Button>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-[12px] text-muted">
        Earn is available for stablecoins on EVM networks today. Solana and Tron are on the roadmap for H2 2026. Your funds stay in a wallet only you control; Rimau never holds them.
      </p>

      <EarnSheet open={open !== null} onClose={() => setOpen(null)} initialProtocol={open ?? "Aave"} />
    </div>
  );
}
