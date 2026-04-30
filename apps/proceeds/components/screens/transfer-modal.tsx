"use client";

import { useState } from "react";
import {
  Fingerprint,
  ArrowUpDown,
  Building2,
  Check,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { erc20Abi, parseUnits, encodeFunctionData } from "viem";
import { Button, Input, Spinner } from "@dynamic-demos/ui";
import { hasRegisteredPasskeys } from "@/lib/dynamic";
import { friendlySmartTxError } from "@/lib/errors";
import { txUrl } from "@/lib/explorer";
import { truncateAddress } from "@/lib/format";
import {
  useSmartAccountTx,
  type SmartAccountTxPhase,
} from "@/hooks/use-smart-account-tx";

// ─── Types ────────────────────────────────────────────────────────────────────

type TransferStep =
  | "choose"
  // wallet-to-wallet steps
  | "form"
  | "biometric_setup"
  | "biometric_registering"
  | "biometric_authorize"
  | "biometric_confirm"
  | "sending"
  | "success"
  | "error"
  // offramp (bank) steps
  | "bank_form"
  | "bank_quoting"
  | "bank_confirm"
  | "bank_processing"
  | "bank_success"
  | "bank_error";

interface OfframpQuote {
  id: string;
  source_amount_usdc: number;
  destination_amount_usd: number;
  exchange_rate: number;
  total_fee_usd: number;
}

const BANK_PROCESSING_STEPS = [
  "Running AML / compliance check",
  "Preparing off-ramp order",
  "Submitting to IRON Finance",
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface TransferModalProps {
  onClose: () => void;
  onSuccess: () => void;
  balance: string | null;
  balanceRaw?: number;
  usdcAddress: `0x${string}` | null;
  chainId: number | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransferModal({
  onClose,
  onSuccess,
  balance,
  balanceRaw,
  usdcAddress,
  chainId,
}: TransferModalProps) {
  // ── wallet transfer state ──
  const [step, setStep] = useState<TransferStep>("choose");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [sendError, setSendError] = useState("");
  const [biometricError, setBiometricError] = useState("");

  // ── offramp state ──
  const [bankAmount, setBankAmount] = useState(
    balanceRaw ? String(Math.floor(balanceRaw * 100) / 100) : "",
  );
  const [bankQuote, setBankQuote] = useState<OfframpQuote | null>(null);
  const [bankError, setBankError] = useState("");
  const [bankProcessingStep, setBankProcessingStep] = useState(0);
  const [bankResult, setBankResult] = useState<{
    id: string;
    destination_amount_usd: number;
  } | null>(null);

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(recipient);
  const isValidAmount = parseFloat(amount) > 0;
  const canSend = isValidAddress && isValidAmount;
  const isValidBankAmount =
    parseFloat(bankAmount) > 0 &&
    (balanceRaw == null || parseFloat(bankAmount) <= balanceRaw);

  const { execute: executeSmartTx } = useSmartAccountTx({
    onPhaseChange: (phase: SmartAccountTxPhase) => {
      switch (phase) {
        case "registering_passkey": setStep("biometric_registering"); return;
        case "activating":         setStep("biometric_authorize"); return;
        case "confirming":         setStep("biometric_confirm"); return;
        case "sending":            setStep("sending"); return;
        case "success":            setStep("success"); return;
        default: return;
      }
    },
  });

  // ── wallet transfer handlers ──────────────────────────────────────────────

  async function handleConfirmSend() {
    const hasPasskeys = await hasRegisteredPasskeys();
    if (!hasPasskeys) {
      setBiometricError("");
      setStep("biometric_setup");
      return;
    }
    await executeSend();
  }

  async function handleRegisterBiometric() {
    setBiometricError("");
    await executeSend();
  }

  async function executeSend() {
    setSendError("");
    try {
      if (!usdcAddress) throw new Error("USDC not supported on this network");
      if (chainId === null) throw new Error("No active network selected");

      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipient as `0x${string}`, parseUnits(amount, 6)],
      });

      const hash = await executeSmartTx({ to: usdcAddress, data, chainId, value: BigInt(0) });
      setTxHash(hash);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      if (msg.includes("cancel") || msg.includes("abort") || msg.includes("not allowed")) {
        if (step === "biometric_registering") {
          setBiometricError("Biometric setup was cancelled. Try again to continue.");
          setStep("biometric_setup");
        } else {
          setSendError("Biometric confirmation was cancelled. Try again when ready.");
          setStep("form");
        }
        return;
      }
      setSendError(friendlySmartTxError(err, "transfer"));
      setStep("error");
    }
  }

  // ── offramp handlers ──────────────────────────────────────────────────────

  async function handleGetBankQuote() {
    setStep("bank_quoting");
    setBankError("");
    try {
      const res = await fetch("/api/iron/offramp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quote",
          amount_usdc: parseFloat(bankAmount),
          chain_id: chainId ?? 11155111,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Quote failed");
      setBankQuote(data as OfframpQuote);
      setStep("bank_confirm");
    } catch (err) {
      setBankError(err instanceof Error ? err.message : String(err));
      setStep("bank_error");
    }
  }

  async function handleExecuteBank() {
    if (!bankQuote) return;
    setStep("bank_processing");
    setBankProcessingStep(0);

    for (let i = 1; i <= BANK_PROCESSING_STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 900));
      setBankProcessingStep(i);
    }

    try {
      const res = await fetch("/api/iron/offramp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          quote_id: bankQuote.id,
          chain_id: chainId ?? 11155111,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Execute failed");
      setBankResult(data as { id: string; destination_amount_usd: number });
      setStep("bank_success");
      onSuccess();
    } catch (err) {
      setBankError(err instanceof Error ? err.message : String(err));
      setStep("bank_error");
    }
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  const explorerUrl = chainId && txHash ? txUrl(chainId, txHash) : null;

  const canClose =
    step !== "biometric_registering" &&
    step !== "biometric_authorize" &&
    step !== "biometric_confirm" &&
    step !== "sending" &&
    step !== "bank_quoting" &&
    step !== "bank_processing";

  const fmtUsd = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (canClose && e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-(--widget-bg) rounded-(--widget-radius-lg) shadow-xl w-full max-w-md">
        <div className="p-6">

          {/* ── CHOOSE ── */}
          {step === "choose" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-(--widget-fg)">Transfer</h2>
                <button onClick={onClose} className="text-sm text-(--widget-primary) hover:underline">
                  Cancel
                </button>
              </div>

              <button
                className="w-full flex items-center gap-3 text-left p-4 rounded-(--widget-radius) bg-(--widget-row-bg) hover:bg-(--widget-row-hover) transition-colors mb-2"
                onClick={() => setStep("form")}
              >
                <ArrowUpDown className="w-5 h-5 text-(--widget-primary)" />
                <div>
                  <div className="text-sm font-semibold text-(--widget-fg)">External wallet</div>
                  <div className="text-xs text-(--widget-muted) mt-0.5">Send USDC to another crypto wallet</div>
                </div>
              </button>

              <button
                className="w-full flex items-center gap-3 text-left p-4 rounded-(--widget-radius) bg-(--widget-row-bg) hover:bg-(--widget-row-hover) transition-colors"
                onClick={() => setStep("bank_form")}
              >
                <Building2 className="w-5 h-5 text-(--widget-primary)" />
                <div>
                  <div className="text-sm font-semibold text-(--widget-fg)">Bank account</div>
                  <div className="text-xs text-(--widget-muted) mt-0.5">
                    Withdraw USDC to USD via IRON Finance
                  </div>
                </div>
              </button>
            </>
          )}

          {/* ══ WALLET TRANSFER STEPS ══ */}

          {step === "form" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setStep("choose")} className="text-sm text-(--widget-primary) hover:underline">Back</button>
                <h2 className="text-base font-semibold text-(--widget-fg)">Send USDC</h2>
                <button onClick={onClose} className="text-sm text-(--widget-muted) hover:underline">Cancel</button>
              </div>
              <div className="space-y-4">
                <div>
                  <Input label="Recipient address" value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} />
                  {recipient && !isValidAddress && (
                    <p className="text-xs text-(--widget-error) mt-1">Enter a valid Ethereum address</p>
                  )}
                </div>
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
                  {balance && <p className="text-xs text-(--widget-muted) mt-1">Balance: {balance}</p>}
                </div>
                <Button className="w-full" onClick={handleConfirmSend} disabled={!canSend}>Send USDC</Button>
              </div>
            </>
          )}

          {step === "biometric_setup" && (
            <div className="flex flex-col items-center gap-5 py-2">
              <div className="w-16 h-16 rounded-full bg-(--widget-row-bg) border-2 border-(--widget-border) flex items-center justify-center">
                <Fingerprint className="w-8 h-8 text-(--widget-primary)" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-(--widget-fg)">Enable biometrics to continue</p>
                <p className="text-xs text-(--widget-muted) mt-1 max-w-[320px]">
                  Face ID or Touch ID is required to authorize this transfer and every future outbound transfer from your wallet.
                </p>
              </div>
              {biometricError && (
                <p className="text-xs text-center text-(--widget-error) max-w-[320px]">{biometricError}</p>
              )}
              <div className="w-full space-y-2">
                <Button className="w-full" onClick={handleRegisterBiometric}>Enable Face ID / Touch ID</Button>
                <Button variant="outline" className="w-full" onClick={() => setStep("form")}>Cancel</Button>
              </div>
            </div>
          )}

          {step === "biometric_registering" && (
            <div className="flex flex-col items-center py-12">
              <Fingerprint className="w-12 h-12 text-(--widget-muted) mb-5" />
              <p className="text-base font-medium text-(--widget-fg)">Complete the biometric prompt</p>
              <p className="text-sm text-(--widget-muted) mt-2 text-center">Approve in your browser to register this device</p>
            </div>
          )}

          {step === "biometric_authorize" && (
            <div className="flex flex-col items-center py-10 px-4">
              <div className="w-14 h-14 rounded-full bg-(--widget-row-bg) border-2 border-(--widget-border) flex items-center justify-center mb-5">
                <Fingerprint className="w-7 h-7 text-(--widget-primary)" />
              </div>
              <p className="text-base font-semibold text-(--widget-fg)">Activate your wallet</p>
              <p className="text-sm text-(--widget-muted) mt-2 text-center max-w-[340px] leading-relaxed">
                Confirm with Touch ID to set up your wallet. This only happens once — next time you&apos;ll go straight to the transfer.
              </p>
              <div className="flex items-center gap-2 mt-5 text-[11px] text-(--widget-muted)">
                <span className="w-1.5 h-1.5 rounded-full bg-(--widget-primary)" /><span>Activate</span>
                <span className="text-(--widget-border)">—</span>
                <span className="w-1.5 h-1.5 rounded-full bg-(--widget-border)" /><span className="opacity-60">Send</span>
              </div>
            </div>
          )}

          {step === "biometric_confirm" && (
            <div className="flex flex-col items-center py-10 px-4">
              <div className="w-14 h-14 rounded-full bg-(--widget-row-bg) border-2 border-(--widget-border) flex items-center justify-center mb-5">
                <Fingerprint className="w-7 h-7 text-(--widget-primary)" />
              </div>
              <p className="text-base font-semibold text-(--widget-fg)">Confirm with Touch ID</p>
              <p className="text-sm text-(--widget-muted) mt-2 text-center">Sending {amount} USDC</p>
              <div className="flex items-center gap-2 mt-5 text-[11px] text-(--widget-muted)">
                <span className="w-1.5 h-1.5 rounded-full bg-(--widget-accent)" /><span className="opacity-60">Activated</span>
                <span className="text-(--widget-border)">—</span>
                <span className="w-1.5 h-1.5 rounded-full bg-(--widget-primary)" /><span>Send</span>
              </div>
            </div>
          )}

          {step === "sending" && (
            <div className="flex flex-col items-center py-12">
              <Spinner size="lg" />
              <p className="text-base font-medium text-(--widget-fg) mt-5">Confirming transaction</p>
              <p className="text-sm text-(--widget-muted) mt-1">Waiting for onchain confirmation…</p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-(--widget-fg)">Transfer sent</p>
              <p className="text-sm text-(--widget-muted) text-center">{amount} USDC sent to {truncateAddress(recipient)}</p>
              {txHash && explorerUrl && (
                <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-(--widget-primary) hover:underline mb-2">
                  View transaction →
                </a>
              )}
              <Button className="w-full mt-2" onClick={onClose}>Done</Button>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-lg font-semibold text-(--widget-fg)">Transfer failed</p>
              <p className="text-xs text-(--widget-muted) text-center max-w-[340px] mb-2">{sendError}</p>
              <div className="flex gap-3 w-full mt-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                <Button className="flex-1" onClick={() => setStep("form")}>Try again</Button>
              </div>
            </div>
          )}

          {/* ══ OFFRAMP (BANK) STEPS ══ */}

          {step === "bank_form" && (
            <>
              <div className="flex items-center justify-between mb-5">
                <button onClick={() => setStep("choose")} className="text-sm text-(--widget-primary) hover:underline">Back</button>
                <h2 className="text-base font-semibold text-(--widget-fg)">Withdraw to bank</h2>
                <button onClick={onClose} className="text-sm text-(--widget-muted) hover:underline">Cancel</button>
              </div>

              <div className="flex items-center gap-3 p-3 mb-5 rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border)">
                <Building2 className="w-5 h-5 text-(--widget-muted) shrink-0" />
                <div>
                  <div className="text-[13px] font-medium text-(--widget-fg)">Bank account · ACH</div>
                  <div className="text-[11px] text-(--widget-muted)">Powered by IRON Finance (MoonPay)</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Input
                    label="Amount (USDC)"
                    type="text"
                    inputMode="decimal"
                    value={bankAmount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.]/g, "");
                      if (v.split(".").length <= 2) setBankAmount(v);
                    }}
                  />
                  {balance && (
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-(--widget-muted)">Available: {balance}</p>
                      {balanceRaw != null && (
                        <button type="button" className="text-xs text-(--widget-primary) hover:underline"
                          onClick={() => setBankAmount(String(Math.floor(balanceRaw * 100) / 100))}>
                          Max
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <Button className="w-full" onClick={handleGetBankQuote} disabled={!isValidBankAmount}>
                  Preview withdrawal
                </Button>
              </div>
            </>
          )}

          {step === "bank_quoting" && (
            <div className="flex flex-col items-center py-12">
              <Spinner size="lg" />
              <p className="text-base font-medium text-(--widget-fg) mt-5">Getting quote…</p>
            </div>
          )}

          {step === "bank_confirm" && bankQuote && (
            <>
              <div className="flex items-center justify-between mb-5">
                <button onClick={() => setStep("bank_form")} className="text-sm text-(--widget-primary) hover:underline">Back</button>
                <h2 className="text-base font-semibold text-(--widget-fg)">Confirm withdrawal</h2>
                <button onClick={onClose} className="text-sm text-(--widget-muted) hover:underline">Cancel</button>
              </div>

              <div className="space-y-2 mb-5">
                <QuoteRow label="You send" value={`${bankQuote.source_amount_usdc.toLocaleString()} USDC`} />
                <QuoteRow label="You receive" value={fmtUsd(bankQuote.destination_amount_usd)} highlight />
                <QuoteRow label="Exchange rate" value={`1 USDC ≈ ${fmtUsd(bankQuote.exchange_rate)}`} />
                <QuoteRow label="Fees" value={bankQuote.total_fee_usd > 0 ? fmtUsd(bankQuote.total_fee_usd) : "—"} />
                <QuoteRow label="Rail" value="ACH · 1–2 business days" />
              </div>

              <p className="text-[11px] text-(--widget-muted) mb-4 text-center">
                IRON Finance will pull USDC from your stablecoin wallet and initiate a bank transfer. Settlement typically takes 1–2 business days.
              </p>

              <Button className="w-full" onClick={handleExecuteBank}>
                Confirm · {fmtUsd(bankQuote.destination_amount_usd)}
              </Button>
            </>
          )}

          {step === "bank_processing" && (
            <div className="py-8 px-2">
              <div className="flex flex-col items-center mb-6">
                <Spinner size="lg" />
                <p className="text-base font-medium text-(--widget-fg) mt-5">Processing withdrawal</p>
              </div>
              <div className="space-y-3">
                {BANK_PROCESSING_STEPS.map((label, i) => (
                  <ProcessingRow
                    key={label}
                    label={label}
                    state={i < bankProcessingStep ? "done" : i === bankProcessingStep ? "active" : "idle"}
                  />
                ))}
              </div>
            </div>
          )}

          {step === "bank_success" && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-(--widget-fg)">Withdrawal initiated</p>
              <p className="text-sm text-(--widget-muted) text-center">
                {bankResult
                  ? `${fmtUsd(bankResult.destination_amount_usd)} will arrive in your bank account in 1–2 business days.`
                  : "Your withdrawal has been submitted to IRON Finance."}
              </p>
              {bankResult?.id && (
                <p className="text-[11px] text-(--widget-muted) mt-1 font-mono">Ref: {bankResult.id.slice(0, 16)}…</p>
              )}
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-(--widget-muted)">
                <Building2 className="w-3.5 h-3.5" />
                <span>Powered by IRON Finance × MoonPay</span>
              </div>
              <Button className="w-full mt-3" onClick={onClose}>Done</Button>
            </div>
          )}

          {step === "bank_error" && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-lg font-semibold text-(--widget-fg)">Withdrawal failed</p>
              <p className="text-xs text-(--widget-muted) text-center max-w-[340px] mb-2">{bankError}</p>
              <div className="flex gap-3 w-full mt-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                <Button className="flex-1" onClick={() => setStep("bank_form")}>Try again</Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Shared subcomponents ─────────────────────────────────────────────────────

function QuoteRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-(--widget-radius) bg-(--widget-row-bg)">
      <span className="text-sm text-(--widget-muted)">{label}</span>
      <span
        className="text-sm font-medium"
        style={{ color: highlight ? "var(--widget-accent)" : "var(--widget-fg)", fontWeight: highlight ? 600 : 500 }}
      >
        {value}
      </span>
    </div>
  );
}

function ProcessingRow({ label, state }: { label: string; state: "idle" | "active" | "done" }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{
          background:
            state === "done" ? "var(--widget-accent)" :
            state === "active" ? "var(--widget-primary)" :
            "var(--widget-border)",
        }}
      >
        {state === "done"   ? <Check className="w-3 h-3 text-white" /> :
         state === "active" ? <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> :
                              <ChevronRight className="w-3 h-3 text-(--widget-muted)" />}
      </span>
      <span
        className="text-sm"
        style={{
          color: state === "idle" ? "var(--widget-muted)" : "var(--widget-fg)",
          fontWeight: state === "active" ? 500 : 400,
        }}
      >
        {label}
      </span>
    </div>
  );
}
