"use client";

import { useEffect, useState } from "react";
import { useBackend } from "@/lib/backend";
import { useSession } from "@/lib/session/store";
import { money, num } from "@/lib/format";
import { APY } from "@/lib/backend/sim";
import type { Position } from "@/lib/session/types";
import { Badge, Button, ErrorNote, Field, Sheet, inputCls } from "@/components/primitives";

const PROTOCOLS: Position["protocol"][] = ["Aave", "Morpho", "Sentora"];

export function EarnSheet({ open, onClose, initialProtocol = "Aave" }: { open: boolean; onClose: () => void; initialProtocol?: Position["protocol"] }) {
  const backend = useBackend();
  const { state } = useSession();
  const [protocol, setProtocol] = useState<Position["protocol"]>(initialProtocol);
  const [amount, setAmount] = useState("300");
  useEffect(() => setProtocol(initialProtocol), [initialProtocol, open]);

  const value = Number(amount);
  const valid = value > 0 && value <= state.balances.usdc;
  const yearly = (value * APY[protocol]) / 100;

  const go = async () => {
    try {
      await backend.openPosition(protocol, value);
      onClose();
    } catch {
      /* inline */
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Earn on your dollars">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {PROTOCOLS.map((p) => (
            <button
              key={p}
              onClick={() => setProtocol(p)}
              className={`rounded-xl border p-3 text-left ${protocol === p ? "border-brand bg-brand-2" : "border-line hover:bg-ground"}`}
            >
              <div className="font-semibold text-[14px]">{p}</div>
              <div className="tnum text-[12px] text-up">{num(APY[p])}% APY</div>
            </button>
          ))}
        </div>
        <Field label="Amount (USD)" hint={`Available ${money(state.balances.usdc)}`}>
          <input className={`${inputCls} tnum`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <div className="rounded-xl bg-ground p-3.5 text-[13px] space-y-2">
          <div className="flex justify-between">
            <span className="text-muted">Estimated yearly</span>
            <span className="tnum font-medium text-up">+{money(yearly)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Withdraw</span>
            <span className="font-medium">Any time</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted">Custody</span>
            <Badge tone="up">Stays in your account</Badge>
          </div>
        </div>
        <p className="text-[12px] text-muted">USDC on Ethereum. Earn covers stablecoins on EVM networks today; Solana and Tron are H2 2026.</p>
        {state.mode === "live" && <p className="text-[12px] text-info">Live mode: the position is recorded in Rimau's ledger for this build; the Earn API is wired server-side in production.</p>}
        <ErrorNote message={backend.error} onDismiss={backend.clearError} />
        <Button size="lg" className="w-full" onClick={go} disabled={!valid} loading={!!backend.busy}>
          Deposit {value > 0 ? money(value) : ""} to {protocol}
        </Button>
      </div>
    </Sheet>
  );
}
