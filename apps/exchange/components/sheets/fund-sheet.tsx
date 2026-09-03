"use client";

import { useEffect, useMemo, useState } from "react";
import { useBackend } from "@/lib/backend";
import { useSession } from "@/lib/session/store";
import { money } from "@/lib/format";
import { Badge, Button, ErrorNote, Sheet } from "@/components/primitives";

/** Deposit address with copy - shown in both modes so the wallet can also be funded from outside. */
function DepositAddress({ address, expanded }: { address: string | null; expanded: boolean }) {
  const [copied, setCopied] = useState(false);
  const [showAddress, setShowAddress] = useState(expanded);
  return (
    <div className="rounded-xl bg-ground p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-muted">Deposit address · Ethereum Sepolia</span>
        <Badge tone="neutral">Testnet</Badge>
      </div>
      {showAddress ? (
        <div className="mt-2 flex items-start gap-2">
          <p className="mono text-[13px] break-all flex-1">{address}</p>
          <Button
            size="sm"
            variant="secondary"
            disabled={!address}
            onClick={() => {
              navigator.clipboard?.writeText(address ?? "").then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      ) : (
        <button className="mt-2 text-[13px] text-brand font-semibold" onClick={() => setShowAddress(true)}>
          Show deposit address
        </button>
      )}
    </div>
  );
}

export function FundSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const backend = useBackend();
  const { state } = useSession();
  const faucetAmounts = backend.faucetAmounts;
  const amounts = useMemo(() => (faucetAmounts.length ? faucetAmounts : [100, 500, 1000]), [faucetAmounts]);
  // Default to the smallest amount; the live faucet's list arrives after mount,
  // so re-pick when the list changes rather than trusting the initial state.
  const [amount, setAmount] = useState<number>(amounts[0] ?? 10);
  useEffect(() => {
    if (!amounts.includes(amount)) setAmount(amounts[0] ?? 10);
  }, [amounts, amount]);

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
          <div className="space-y-2">
            <p className="text-[12px] text-muted">Or send Sepolia USDC from any wallet. The balance updates by itself once it lands.</p>
            <DepositAddress address={address} expanded={false} />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-[14px] text-ink-2">Send Sepolia USDC to your Exchange account. The balance updates by itself once it lands.</p>
          <DepositAddress address={address} expanded={false} />
          <Button className="w-full" onClick={() => backend.refreshBalances().then(onClose)}>
            Refresh balance
          </Button>
          <p className="text-[12px] text-muted">
            Balance now: <span className="tnum">{money(state.balances.usdc)}</span>. Presenter note: pre-fund from your testnet wallet before the session so this beat is instant.
          </p>
        </div>
      )}
    </Sheet>
  );
}
