"use client";

import { useState } from "react";
import { useBackend } from "@/lib/backend";
import { useSession } from "@/lib/session/store";
import { money } from "@/lib/format";
import { Badge, Button, ErrorNote, Sheet } from "@/components/primitives";

export function FundSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const backend = useBackend();
  const { state } = useSession();
  const amounts = backend.faucetAmounts.length ? backend.faucetAmounts : [100, 500, 1000];
  const [amount, setAmount] = useState<number>(amounts[Math.min(1, amounts.length - 1)] ?? 100);
  const [copied, setCopied] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

  const fund = async () => {
    try {
      await backend.fund(amount);
      onClose();
    } catch {
      /* error shown inline */
    }
  };

  const address = backend.depositAddress();

  return (
    <Sheet open={open} onClose={onClose} title="Add funds">
      {backend.canFaucet ? (
        <div className="space-y-5">
          <p className="text-[14px] text-ink-2">Choose an amount. Testnet funds arrive from the Exchange faucet in a few seconds.</p>
          <div className="grid grid-cols-3 gap-2">
            {amounts.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`h-12 rounded-xl border text-[15px] font-semibold tnum ${amount === v ? "border-brand bg-brand-2 text-brand" : "border-line hover:bg-ground"}`}
              >
                {money(v, { digits: 0 })}
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-ground p-3.5 text-[13px] text-muted flex items-center justify-between">
            <span>Method</span>
            <span className="text-ink font-medium">Testnet faucet · USDC</span>
          </div>
          <ErrorNote message={backend.error} onDismiss={backend.clearError} />
          <Button size="lg" className="w-full" onClick={fund} loading={!!backend.busy}>
            Add {money(amount, { digits: 0 })}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-[14px] text-ink-2">Send Sepolia USDC to your Exchange account. The balance updates by itself once it lands.</p>
          <div className="rounded-xl bg-ground p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-muted">Deposit address · Ethereum Sepolia</span>
              <Badge tone="neutral">Testnet</Badge>
            </div>
            {showAddress ? (
              <p className="mono text-[13px] break-all mt-2">{address}</p>
            ) : (
              <button className="mt-2 text-[13px] text-brand font-semibold" onClick={() => setShowAddress(true)}>
                Show deposit address
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={!address}
              onClick={() => {
                navigator.clipboard?.writeText(address ?? "").then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? "Copied" : "Copy address"}
            </Button>
            <Button className="flex-1" onClick={() => backend.refreshBalances().then(onClose)}>
              Refresh balance
            </Button>
          </div>
          <p className="text-[12px] text-muted">
            Balance now: <span className="tnum">{money(state.balances.usdc)}</span>. Presenter note: pre-fund from your testnet wallet before the session so this beat is instant.
          </p>
        </div>
      )}
    </Sheet>
  );
}
