"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session/store";
import { useBackend } from "@/lib/backend";
import { money, num, relTime } from "@/lib/format";
import { Activity } from "@/components/activity";
import { Badge, Button, Card, Eyebrow, Icon } from "@/components/primitives";
import { FundSheet } from "@/components/sheets/fund-sheet";
import { SendSheet } from "@/components/sheets/send-sheet";
import { EarnSheet } from "@/components/sheets/earn-sheet";
import { ConnectSheet } from "@/components/sheets/connect-sheet";
import { useTicker } from "@/components/markets";
import { pct } from "@/lib/format";
import { onOpenSheet, type SheetName } from "@/components/open-sheet";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export function Portfolio() {
  const { state } = useSession();
  const backend = useBackend();
  const [sheet, setSheet] = useState<SheetName | null>(null);
  useEffect(() => onOpenSheet(setSheet), []);

  const person = state.person!;
  const wallet = state.wallet!;
  const inEarn = state.positions.reduce((s, p) => s + p.principal, 0);
  const total = state.balances.usdc + inEarn;
  const justRestored = wallet.recoveredAt && Date.now() - wallet.recoveredAt < 120_000;

  return (
    <div className="rise grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-6">
        {justRestored && (
          <div className="rise flex items-center gap-3 rounded-2xl bg-info-2 text-info px-4 py-3 text-[14px]">
            <Icon.Shield />
            <span>
              <strong>Restored on this device.</strong> Same account, same balance, same positions. Nothing was typed, nothing was held by Exchange.
            </span>
          </div>
        )}

        <Card>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Eyebrow>{greeting()}, {person.name.split(" ")[0]}</Eyebrow>
              <div className="tnum text-[44px] leading-none font-bold tracking-tight mt-3">{money(total)}</div>
              <div className="mt-2 text-[13px] text-muted">
                <span className="tnum">{money(state.balances.usdc)}</span> available · <span className="tnum">{money(inEarn)}</span> in Earn
                {state.balances.updatedAt > 0 && state.mode === "live" && <span> · updated {relTime(state.balances.updatedAt)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="up">
                <Icon.Shield className="h-3 w-3" /> Self-custody
              </Badge>
              <Badge tone="neutral">{wallet.chainName}</Badge>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button size="lg" onClick={() => setSheet("fund")} disabled={!!backend.busy}>
              Add funds
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setSheet("send")} disabled={!!backend.busy}>
              Send
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setSheet("earn")} disabled={!!backend.busy}>
              Earn
            </Button>
          </div>
        </Card>

        <MarketsStrip />

        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h2 className="font-semibold">Balances</h2>
            <span className="text-[12px] text-muted">Held in your Exchange account, keys under your control</span>
          </div>
          <ul>
            <Row icon="$" name="US Dollar" sub="USDC · stablecoin" value={money(state.balances.usdc)} />
            {state.positions.map((p) => (
              <Row key={p.id} icon="%" name={`Earn · ${p.protocol}`} sub={`${num(p.apy)}% APY · USDC`} value={money(p.principal)} tone="up" />
            ))}
            <Row
              icon="Ξ"
              name="Ethereum"
              sub="Network fees"
              value={`${num(state.balances.eth, 4)} ETH`}
              note={state.balances.eth === 0 ? "You don't need ETH. Exchange covers network fees on your transfers." : undefined}
            />
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold">Your wallets</h2>
              <p className="text-[13px] text-muted mt-0.5">One account, both kinds of wallet. Trade, earn and send from either.</p>
            </div>
            {!state.external && (
              <Button variant="secondary" onClick={() => setSheet("connect")} disabled={!!backend.busy}>
                <Icon.Fox /> Connect MetaMask
              </Button>
            )}
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <WalletTile label="Exchange account" sub="Created with your sign-in · 2-of-2 · keys never leave your control" address={wallet.address} revealed={state.revealAddress} active />
            {state.external ? (
              <WalletTile label={state.external.label} sub="Your own wallet, connected to this session" address={state.external.address} revealed={state.revealAddress} fox />
            ) : (
              <div className="rounded-xl border border-dashed border-line p-4 text-[13px] text-muted">
                Already have a wallet? Connect it and keep your DeFi activity inside Exchange: same session, same limits, same support.
              </div>
            )}
          </div>
        </Card>
      </div>

      <aside className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent activity</h2>
            <Link className="text-[13px] text-brand font-semibold" href="/activity">
              See all
            </Link>
          </div>
          <Activity compact />
        </div>
      </aside>

      <FundSheet open={sheet === "fund"} onClose={() => setSheet(null)} />
      <SendSheet open={sheet === "send"} onClose={() => setSheet(null)} />
      <EarnSheet open={sheet === "earn"} onClose={() => setSheet(null)} />
      <ConnectSheet open={sheet === "connect"} onClose={() => setSheet(null)} />
    </div>
  );
}

function MarketsStrip() {
  const rows = useTicker().slice(0, 4);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {rows.map((r) => (
        <Link key={r.sym} href="/markets" className="exchange-card p-3.5 text-left hover:bg-ground/60 transition-colors block">
          <div className="flex items-center justify-between text-[12px] text-muted">
            <span className="font-semibold text-ink-2">{r.sym}</span>
            <span className={`tnum ${r.change >= 0 ? "text-up" : "text-down"}`}>{pct(r.change)}</span>
          </div>
          <div className="tnum font-semibold mt-1.5">{money(r.price, { digits: r.price < 10 ? 4 : 2 })}</div>
        </Link>
      ))}
    </div>
  );
}

function Row({ icon, name, sub, value, tone, note }: { icon: string; name: string; sub: string; value: string; tone?: "up"; note?: string }) {
  return (
    <li className="flex items-center gap-3.5 px-5 py-3.5 border-b border-line last:border-0">
      <span className={`h-9 w-9 rounded-full grid place-items-center font-bold ${tone === "up" ? "bg-up-2 text-up" : "bg-ground text-ink-2"}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[14px]">{name}</div>
        <div className="text-[12px] text-muted">{sub}</div>
        {note && <div className="text-[12px] text-brand mt-1">{note}</div>}
      </div>
      <div className="tnum font-semibold">{value}</div>
    </li>
  );
}

function WalletTile({ label, sub, address, revealed, active, fox }: { label: string; sub: string; address: string; revealed: boolean; active?: boolean; fox?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${active ? "border-brand/30 bg-brand-2/40" : "border-line"}`}>
      <div className="flex items-center gap-2">
        {fox ? <Icon.Fox /> : <span className="h-5 w-5 rounded-md bg-brand text-brand-fg grid place-items-center text-[11px] font-extrabold">R</span>}
        <span className="font-semibold text-[14px]">{label}</span>
        {active && <Badge tone="brand" className="ml-auto">Default</Badge>}
      </div>
      <p className="text-[12px] text-muted mt-1.5">{sub}</p>
      {revealed && <p className="mono text-[11px] text-ink-2 mt-2 break-all">{address}</p>}
    </div>
  );
}
