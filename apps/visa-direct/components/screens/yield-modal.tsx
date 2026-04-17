"use client";

/**
 * Earn yield modal — demo flow.
 *
 * Shows three representative USDC yield strategies (Aave, Morpho,
 * Compound) with illustrative APYs and lets the host "deposit"
 * idle USDC into one of them. Nothing hits a contract: we persist
 * the position in localStorage (see `useYieldPositions`) so the
 * wallet screen can render the result and tell a coherent story.
 *
 * Steps:
 *   select   — pick a strategy
 *   amount   — enter deposit amount (capped by wallet balance)
 *   success  — confirmation card (auto-dismiss)
 */

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Sparkles, TrendingUp, X } from "lucide-react";
import { Button, Input } from "@dynamic-demos/ui";
import { cn } from "@dynamic-demos/utils";
import {
  useYieldPositions,
  type YieldStrategy,
} from "@/hooks/use-yield-positions";

type Step = "select" | "amount" | "success";

interface YieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  formattedBalance: string;
  /**
   * Called after a successful deposit. Used by the parent screen to
   * re-query the on-chain USDC balance so the hero figure (and any
   * derived display) reflects the action the moment the user sees
   * the success card.
   */
  onDeposit?: () => void;
}

export function YieldModal({
  isOpen,
  onClose,
  balance,
  formattedBalance,
  onDeposit,
}: YieldModalProps) {
  const { strategies, deposit } = useYieldPositions();
  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<YieldStrategy | null>(null);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setSelected(null);
      setAmount("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const numericAmount = Number(amount);
  const canConfirm =
    !!selected && numericAmount > 0 && numericAmount <= balance;

  function handleConfirm() {
    if (!canConfirm || !selected) return;
    deposit(selected.id, numericAmount);
    onDeposit?.();
    setStep("success");
    window.setTimeout(onClose, 2200);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-(--widget-bg) rounded-(--widget-radius-lg) shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-(--widget-border)">
          <div className="flex items-center gap-3">
            {step === "amount" && (
              <button
                type="button"
                onClick={() => setStep("select")}
                className="p-1.5 rounded-md text-(--widget-muted) hover:text-(--widget-fg) hover:bg-(--widget-row-hover) transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-(--widget-fg)">
                {step === "select"
                  ? "Earn yield on USDC"
                  : step === "amount" && selected
                    ? `Deposit into ${selected.protocol}`
                    : "Deposit submitted"}
              </h2>
              {step === "select" && (
                <p className="text-xs text-(--widget-muted) mt-0.5">
                  Put idle payouts to work
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-(--widget-muted) hover:text-(--widget-fg) hover:bg-(--widget-row-hover) transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {/* Step — select */}
          {step === "select" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 px-3 py-2 rounded-(--widget-radius) bg-amber-50 border border-amber-200 text-amber-800">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  Demo rates. Production would fetch live APYs and
                  broadcast a real deposit to the selected protocol.
                </p>
              </div>

              {strategies.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelected(s);
                    setStep("amount");
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-(--widget-radius) border border-(--widget-border) bg-(--widget-row-bg) hover:bg-(--widget-row-hover) hover:border-(--widget-primary)/40 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-(--widget-bg) border border-(--widget-border) flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-(--widget-primary)" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-(--widget-fg)">
                        {s.protocol}
                      </p>
                      <span className="text-sm font-semibold text-(--widget-success) tabular-nums">
                        {s.apy.toFixed(2)}% APY
                      </span>
                    </div>
                    <p className="text-xs text-(--widget-muted) mt-0.5 truncate">
                      {s.tagline}
                    </p>
                    <p className="text-[11px] text-(--widget-muted) mt-1">
                      {s.asset} · {s.network}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step — amount */}
          {step === "amount" && selected && (
            <div className="space-y-4">
              <div className="rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border) p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-(--widget-fg)">
                    {selected.protocol}
                  </p>
                  <span className="text-sm font-semibold text-(--widget-success) tabular-nums">
                    {selected.apy.toFixed(2)}% APY
                  </span>
                </div>
                <p className="text-xs text-(--widget-muted) mt-1">
                  {selected.tagline}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-(--widget-fg)">
                    Amount to deposit
                  </span>
                  <button
                    type="button"
                    onClick={() => setAmount(balance.toString())}
                    className="text-xs text-(--widget-primary) hover:underline"
                    disabled={balance <= 0}
                  >
                    Max
                  </button>
                </div>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                    if (cleaned.split(".").length <= 2) setAmount(cleaned);
                  }}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-(--widget-muted)">
                    Available: {formattedBalance}
                  </span>
                  {amount && numericAmount > balance && (
                    <span className="text-xs text-(--widget-error)">
                      Exceeds balance
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-(--widget-radius) border border-(--widget-border) divide-y divide-(--widget-border) text-xs">
                <Row
                  label="Projected annual earnings"
                  value={formatUsd(
                    (numericAmount || 0) * (selected.apy / 100),
                  )}
                  highlight
                />
                <Row
                  label="Projected monthly earnings"
                  value={formatUsd(
                    ((numericAmount || 0) * (selected.apy / 100)) / 12,
                  )}
                />
                <Row label="Network" value={selected.network} />
                <Row label="Lock-up" value="None — withdraw anytime" />
              </div>

              <Button
                className="w-full"
                onClick={handleConfirm}
                disabled={!canConfirm}
              >
                Deposit {amount || "0"} USDC
              </Button>
            </div>
          )}

          {/* Step — success */}
          {step === "success" && selected && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-(--widget-fg)">
                Earning started
              </p>
              <p className="text-sm text-(--widget-muted) text-center">
                {formatUsd(numericAmount)} deposited into{" "}
                {selected.protocol} at {selected.apy.toFixed(2)}% APY
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="text-(--widget-muted)">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          highlight
            ? "font-semibold text-(--widget-success)"
            : "font-medium text-(--widget-fg)",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function formatUsd(value: number): string {
  return (
    "$" +
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
