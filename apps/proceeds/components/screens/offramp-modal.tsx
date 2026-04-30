"use client";

import { useState } from "react";
import { Building2, Check, AlertTriangle, ChevronRight } from "lucide-react";
import { Button, Input, Spinner } from "@dynamic-demos/ui";

interface OfframpQuote {
  id: string;
  source_amount_usdc: number;
  destination_amount_usd: number;
  exchange_rate: number;
  total_fee_usd: number;
  expires_at: string;
}

interface OfframpResult {
  id: string;
  status: string;
  destination_amount_usd: number;
  created_at: string;
}

type Step = "form" | "quoting" | "confirm" | "processing" | "success" | "error";

const PROCESSING_STEPS = [
  "Running AML / compliance check",
  "Preparing off-ramp order",
  "Submitting to IRON Finance",
];

interface OfframpModalProps {
  onClose: () => void;
  balance: string | null;
  balanceRaw: number | null;
  chainId: number | null;
}

export function OfframpModal({
  onClose,
  balance,
  balanceRaw,
  chainId,
}: OfframpModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState(balanceRaw ? String(Math.floor(balanceRaw * 100) / 100) : "");
  const [quote, setQuote] = useState<OfframpQuote | null>(null);
  const [result, setResult] = useState<OfframpResult | null>(null);
  const [error, setError] = useState("");
  const [processingStep, setProcessingStep] = useState(0);

  const isValidAmount =
    parseFloat(amount) > 0 &&
    (balanceRaw === null || parseFloat(amount) <= balanceRaw);

  async function handleGetQuote() {
    setStep("quoting");
    setError("");
    try {
      const res = await fetch("/api/iron/offramp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quote",
          amount_usdc: parseFloat(amount),
          chain_id: chainId ?? 11155111,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quote failed");
      setQuote(data as OfframpQuote);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }

  async function handleExecute() {
    if (!quote) return;
    setStep("processing");
    setProcessingStep(0);

    // Animate processing steps
    for (let i = 1; i <= PROCESSING_STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 900));
      setProcessingStep(i);
    }

    try {
      const res = await fetch("/api/iron/offramp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          quote_id: quote.id,
          chain_id: chainId ?? 11155111,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Execute failed");
      setResult(data as OfframpResult);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }

  const canClose = step !== "processing" && step !== "quoting";

  const fmtUsd = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => canClose && e.target === e.currentTarget && onClose()}
    >
      <div className="bg-(--widget-bg) rounded-(--widget-radius-lg) shadow-xl w-full max-w-md">
        <div className="p-6">
          {/* ── FORM ── */}
          {step === "form" && (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-(--widget-fg)">
                  Withdraw to bank
                </h2>
                <button
                  onClick={onClose}
                  className="text-sm text-(--widget-primary) hover:underline"
                >
                  Cancel
                </button>
              </div>

              <div className="flex items-center gap-3 p-3 mb-5 rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border)">
                <Building2 className="w-5 h-5 text-(--widget-muted) shrink-0" />
                <div>
                  <div className="text-[13px] font-medium text-(--widget-fg)">
                    Bank account · ACH
                  </div>
                  <div className="text-[11px] text-(--widget-muted)">
                    Powered by IRON Finance (MoonPay)
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Input
                    label="Amount (USDC)"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.]/g, "");
                      if (v.split(".").length <= 2) setAmount(v);
                    }}
                  />
                  {balance && (
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-(--widget-muted)">
                        Available: {balance}
                      </p>
                      {balanceRaw !== null && (
                        <button
                          type="button"
                          className="text-xs text-(--widget-primary) hover:underline"
                          onClick={() =>
                            setAmount(String(Math.floor(balanceRaw * 100) / 100))
                          }
                        >
                          Max
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={handleGetQuote}
                  disabled={!isValidAmount}
                >
                  Preview withdrawal
                </Button>
              </div>
            </>
          )}

          {/* ── QUOTING ── */}
          {step === "quoting" && (
            <div className="flex flex-col items-center py-12">
              <Spinner size="lg" />
              <p className="text-base font-medium text-(--widget-fg) mt-5">
                Getting quote…
              </p>
            </div>
          )}

          {/* ── CONFIRM ── */}
          {step === "confirm" && quote && (
            <>
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={() => setStep("form")}
                  className="text-sm text-(--widget-primary) hover:underline"
                >
                  Back
                </button>
                <h2 className="text-base font-semibold text-(--widget-fg)">
                  Confirm withdrawal
                </h2>
                <button
                  onClick={onClose}
                  className="text-sm text-(--widget-muted) hover:underline"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-2 mb-5">
                <QuoteRow
                  label="You send"
                  value={`${quote.source_amount_usdc.toLocaleString()} USDC`}
                />
                <QuoteRow
                  label="You receive"
                  value={fmtUsd(quote.destination_amount_usd)}
                  highlight
                />
                <QuoteRow
                  label="Exchange rate"
                  value={`1 USDC ≈ ${fmtUsd(quote.exchange_rate)}`}
                />
                <QuoteRow
                  label="Fees"
                  value={quote.total_fee_usd > 0 ? fmtUsd(quote.total_fee_usd) : "—"}
                />
                <QuoteRow label="Rail" value="ACH · 1–2 business days" />
              </div>

              <p className="text-[11px] text-(--widget-muted) mb-4 text-center">
                IRON Finance will pull USDC from your stablecoin wallet and
                initiate a bank transfer. Settlement typically takes 1–2
                business days.
              </p>

              <Button className="w-full" onClick={handleExecute}>
                Confirm · {fmtUsd(quote.destination_amount_usd)}
              </Button>
            </>
          )}

          {/* ── PROCESSING ── */}
          {step === "processing" && (
            <div className="py-8 px-2">
              <div className="flex flex-col items-center mb-6">
                <Spinner size="lg" />
                <p className="text-base font-medium text-(--widget-fg) mt-5">
                  Processing withdrawal
                </p>
              </div>
              <div className="space-y-3">
                {PROCESSING_STEPS.map((label, i) => (
                  <ProcessingRow
                    key={label}
                    label={label}
                    state={
                      i < processingStep
                        ? "done"
                        : i === processingStep
                        ? "active"
                        : "idle"
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-(--widget-fg)">
                Withdrawal initiated
              </p>
              <p className="text-sm text-(--widget-muted) text-center">
                {result
                  ? `${fmtUsd(result.destination_amount_usd)} will arrive in your bank account in 1–2 business days.`
                  : "Your withdrawal has been submitted to IRON Finance."}
              </p>
              {result?.id && (
                <p className="text-[11px] text-(--widget-muted) mt-1 font-mono">
                  Ref: {result.id.slice(0, 16)}…
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-(--widget-muted)">
                <Building2 className="w-3.5 h-3.5" />
                <span>Powered by IRON Finance × MoonPay</span>
              </div>
              <Button className="w-full mt-3" onClick={onClose}>
                Done
              </Button>
            </div>
          )}

          {/* ── ERROR ── */}
          {step === "error" && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-lg font-semibold text-(--widget-fg)">
                Withdrawal failed
              </p>
              <p className="text-xs text-(--widget-muted) text-center max-w-[340px] mb-2">
                {error}
              </p>
              <div className="flex gap-3 w-full mt-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => setStep("form")}>
                  Try again
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuoteRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-(--widget-radius) bg-(--widget-row-bg)">
      <span className="text-sm text-(--widget-muted)">{label}</span>
      <span
        className="text-sm font-medium"
        style={{
          color: highlight ? "var(--widget-accent)" : "var(--widget-fg)",
          fontWeight: highlight ? 600 : 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ProcessingRow({
  label,
  state,
}: {
  label: string;
  state: "idle" | "active" | "done";
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{
          background:
            state === "done"
              ? "var(--widget-accent)"
              : state === "active"
              ? "var(--widget-primary)"
              : "var(--widget-border)",
        }}
      >
        {state === "done" ? (
          <Check className="w-3 h-3 text-white" />
        ) : state === "active" ? (
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        ) : (
          <ChevronRight className="w-3 h-3 text-(--widget-muted)" />
        )}
      </span>
      <span
        className="text-sm"
        style={{
          color:
            state === "idle"
              ? "var(--widget-muted)"
              : "var(--widget-fg)",
          fontWeight: state === "active" ? 500 : 400,
        }}
      >
        {label}
      </span>
    </div>
  );
}
