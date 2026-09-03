"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { useBackend } from "@/lib/backend";
import { useSession } from "@/lib/session/store";
import { money, num, shortHash } from "@/lib/format";
import { addressFor } from "@/lib/backend/sim";
import { SEPOLIA_EXPLORER } from "@/lib/backend/types";
import { Badge, Button, ErrorNote, Field, Sheet, inputCls } from "@/components/primitives";

/** A believable recipient for the stage: the same one every run. */
export const DEMO_RECIPIENT = { name: "Kopi & Co.", role: "Merchant · Rimau Pay", address: addressFor("rimau:recipient:kopi-merchant") };

/** Beat 3. The ETH row reads 0.0000 on purpose. The transfer goes through anyway. */
export function SendSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const backend = useBackend();
  const { state } = useSession();
  const [to, setTo] = useState<string>(DEMO_RECIPIENT.address);
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState("25");
  const [done, setDone] = useState<{ hash?: string } | null>(null);

  const value = Number(amount);
  const valid = isAddress(to) && value > 0 && value <= state.balances.usdc;
  const sponsored = state.balances.eth === 0;

  const send = async () => {
    try {
      await backend.transfer(to as `0x${string}`, value);
      const last = state.activity[0];
      setDone({ hash: last?.txHash });
    } catch {
      /* error shown inline */
    }
  };

  const close = () => {
    setDone(null);
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Send">
      {done ? (
        <div className="text-center py-4 rise">
          <div className="mx-auto h-14 w-14 rounded-full bg-up-2 text-up grid place-items-center text-2xl font-bold">✓</div>
          <h3 className="mt-4 text-lg font-bold">Sent {money(value)}</h3>
          <p className="text-[13px] text-muted mt-1">Confirmed on Ethereum Sepolia.</p>
          <div className="mt-4 rounded-xl bg-ground p-3.5 text-[13px] text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted">Network fee</span>
              <span className="font-medium">{sponsored ? "Sponsored by Rimau" : "Paid from balance"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Your ETH balance</span>
              <span className="tnum font-medium">{num(state.balances.eth, 4)} ETH</span>
            </div>
            {state.revealAddress && state.activity[0]?.txHash && (
              <div className="flex justify-between">
                <span className="text-muted">Receipt</span>
                <a className="mono text-info hover:underline" href={`${SEPOLIA_EXPLORER}/tx/${state.activity[0].txHash}`} target="_blank" rel="noreferrer">
                  {shortHash(state.activity[0].txHash)}
                </a>
              </div>
            )}
          </div>
          <Button size="lg" className="w-full mt-5" onClick={close}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {custom ? (
            <Field label="To" hint="Any Ethereum address on Sepolia.">
              <input className={`${inputCls} mono text-[13px]`} value={to} onChange={(e) => setTo(e.target.value.trim())} spellCheck={false} autoFocus />
            </Field>
          ) : (
            <div>
              <span className="block text-[12px] font-semibold text-ink-2 mb-1.5">To</span>
              <div className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5">
                <span className="h-9 w-9 rounded-full bg-ground grid place-items-center font-bold text-ink-2">K</span>
                <div className="flex-1">
                  <div className="font-semibold text-[14px]">{DEMO_RECIPIENT.name}</div>
                  <div className="text-[12px] text-muted">{DEMO_RECIPIENT.role}</div>
                </div>
                <button className="text-[12px] text-brand font-semibold" onClick={() => setCustom(true)}>
                  Use an address
                </button>
              </div>
            </div>
          )}
          <Field label="Amount (USD)" hint={`Available ${money(state.balances.usdc)}`}>
            <input className={`${inputCls} tnum`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <div className="rounded-xl bg-ground p-3.5 text-[13px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted">Network fee</span>
              <span className="flex items-center gap-2">
                <span className="tnum line-through text-muted">~$0.42</span>
                <Badge tone="brand">Sponsored by Rimau</Badge>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Your ETH balance</span>
              <span className="tnum font-medium">{num(state.balances.eth, 4)} ETH</span>
            </div>
            <p className="text-[12px] text-muted pt-1 border-t border-line">
              You hold no ETH and do not need any. The fee is paid by Rimau's relayer (EIP-7702). Enterprise feature, provisioned per environment.
            </p>
          </div>
          <ErrorNote message={backend.error} onDismiss={backend.clearError} />
          <Button size="lg" className="w-full" onClick={send} disabled={!valid} loading={!!backend.busy}>
            Send {value > 0 ? money(value) : ""}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
