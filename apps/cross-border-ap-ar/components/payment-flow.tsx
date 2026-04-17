"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowLeft, X } from "lucide-react";
import { useDisbursements } from "@/contexts/disbursement-context";
import type { CompletedTransaction } from "@/contexts/disbursement-context";
import { SandwichRoute } from "./sandwich-route";
import { ExecStep } from "./exec-step";
import { USDC_MXN_RATE } from "@/lib/mock-data";
import { formatUSD, formatMXN, formatDate, truncateAddress } from "@/lib/utils";

interface PaymentFlowProps {
  id: string;
}

type FlowStep = "review" | "executing" | "success" | "error";
type SubStepState = "pending" | "active" | "done";

interface OfframpResult {
  orderId: string;
  depositAddress: string;
  blockchain: string;
  rate: number;
  expiresAt: string;
  stub: boolean;
}

interface OnrampResult {
  orderId: string;
  status: string;
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span
        className={`text-sm text-gray-800 text-right ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "green" | "gray";
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 px-3 py-2 rounded-lg border ${
        color === "green"
          ? "border-green-200 bg-green-50"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">
        {label}
      </span>
      <span
        className={`text-xs font-mono break-all ${
          color === "green" ? "text-green-700" : "text-gray-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function PaymentFlow({ id }: PaymentFlowProps) {
  const router = useRouter();
  const { disbursements, markPaid } = useDisbursements();
  const disbursement = disbursements.find((d) => d.id === id);

  const [step, setStep] = useState<FlowStep>("review");
  const [subSteps, setSubSteps] = useState<SubStepState[]>([
    "pending",
    "pending",
    "pending",
  ]);
  const [offrampResult, setOfframpResult] = useState<OfframpResult | null>(
    null,
  );
  const [onrampResult, setOnrampResult] = useState<OnrampResult | null>(null);
  const [successData, setSuccessData] = useState<CompletedTransaction | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const setSubStep = (index: number, state: SubStepState) => {
    setSubSteps((prev) => {
      const next = [...prev] as SubStepState[];
      next[index] = state;
      return next;
    });
  };

  const handleDisburse = async () => {
    if (!disbursement) return;

    setStep("executing");
    setSubSteps(["active", "pending", "pending"]);

    try {
      const offrampRes = await fetch("/api/orders/offramp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disbursementId: disbursement.id,
          amountUSDC: disbursement.amountUSDC,
          beneficiary: {
            accountName: disbursement.recipient,
            bank: disbursement.bank,
            clabe: disbursement.clabe,
            accountNumber: disbursement.accountNumber,
          },
        }),
      });

      if (!offrampRes.ok) {
        const err = await offrampRes.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "Off-ramp order failed",
        );
      }

      const offramp = (await offrampRes.json()) as OfframpResult;
      setOfframpResult(offramp);
      setSubStep(0, "done");

      await new Promise((r) => setTimeout(r, 800));
      setSubStep(1, "active");
      await new Promise((r) => setTimeout(r, 400));
      setSubStep(1, "done");

      await new Promise((r) => setTimeout(r, 500));
      setSubStep(2, "active");

      const onrampRes = await fetch("/api/orders/onramp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disbursementId: disbursement.id,
          amountUSDC: disbursement.amountUSDC,
          depositAddress: offramp.depositAddress,
          stub: offramp.stub,
        }),
      });

      if (!onrampRes.ok) {
        const err = await onrampRes.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "On-ramp order failed",
        );
      }

      const onramp = (await onrampRes.json()) as OnrampResult;
      setOnrampResult(onramp);
      setSubStep(2, "done");

      await new Promise((r) => setTimeout(r, 700));

      const txResult = {
        offrampOrderId: offramp.orderId,
        onrampOrderId: onramp.orderId,
        depositAddress: offramp.depositAddress,
        blockchain: "Ethereum" as const,
        rate: offramp.rate,
        expiresAt: offramp.expiresAt,
      };

      markPaid(disbursement.id, txResult);

      setSuccessData({
        id: disbursement.id,
        paidAt: new Date().toISOString(),
        disbursement: { ...disbursement },
        ...txResult,
      });

      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disbursement failed");
      setStep("error");
    }
  };

  if (!disbursement && step !== "success") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Disbursement not found.</p>
        <button
          onClick={() => router.push("/disbursements")}
          className="mt-4 text-[#F1641E] hover:underline text-sm"
        >
          Back to disbursements
        </button>
      </div>
    );
  }

  if (step === "review" && disbursement) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push("/disbursements")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to disbursements
        </button>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <h1 className="text-lg font-semibold text-gray-900">
              Review disbursement
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {disbursement.id} · {disbursement.shopName}
            </p>
          </div>

          <div className="px-6 py-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Payment route
            </p>
            <SandwichRoute sellerBank={disbursement.bank} />
          </div>

          <div className="px-6 pb-5">
            <div className="bg-gray-50 rounded-lg px-4 py-1">
              <DetailRow
                label="Seller"
                value={`${disbursement.shopName} — ${disbursement.recipient}`}
              />
              <DetailRow label="Category" value={disbursement.category} />
              <DetailRow
                label="Orders"
                value={`${disbursement.ordersCount} orders · period ending ${formatDate(disbursement.periodEnd)}`}
              />
              <DetailRow label="Amount" value={formatUSD(disbursement.amountUSD)} />
              <DetailRow
                label="MXN equivalent"
                value={formatMXN(disbursement.amountMXN)}
              />
              <DetailRow
                label="FX rate"
                value={`1 USDC = ${USDC_MXN_RATE} MXN (via alfredPay)`}
              />
              <DetailRow
                label="USDC amount"
                value={`${disbursement.amountUSDC} USDC (Ethereum)`}
              />
              <DetailRow label="Off-ramp" value="alfredPay — DVP" />
              <DetailRow label="Recipient" value={disbursement.recipient} />
              <DetailRow label="Bank" value={disbursement.bank} />
              <DetailRow label="CLABE" value={disbursement.clabe} mono />
              <DetailRow label="Settlement" value="SPEI · est. 30 minutes" />
            </div>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => router.push("/disbursements")}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDisburse}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors"
              style={{ backgroundColor: "#F1641E" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "#d9521a")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "#F1641E")
              }
            >
              Disburse funds
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "executing") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <h1 className="text-lg font-semibold text-gray-900">
              Processing disbursement
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Do not close this window
            </p>
          </div>
          <div className="px-6 py-5 space-y-3">
            <ExecStep
              state={subSteps[0]!}
              num={1}
              label="Creating off-ramp order"
              sub="alfredPay · USDC → MXN via SPEI (DVP)"
              detail={
                offrampResult
                  ? `Order ID: ${offrampResult.orderId} · Rate: 1 USDC = ${offrampResult.rate} MXN · DVP`
                  : undefined
              }
            />
            <ExecStep
              state={subSteps[1]!}
              num={2}
              label="Receiving USDC deposit address"
              sub="alfredPay responds with Ethereum deposit address"
              detail={
                offrampResult
                  ? `${offrampResult.depositAddress} · Ethereum · Expires ${offrampResult.expiresAt}`
                  : undefined
              }
            />
            <ExecStep
              state={subSteps[2]!}
              num={3}
              label="Creating on-ramp order"
              sub="MTLco · USD → USDC → alfredPay deposit address"
              detail={
                onrampResult && offrampResult
                  ? `Order ID: ${onrampResult.orderId} · ${disbursement?.amountUSDC ?? ""} USDC → ${truncateAddress(offrampResult.depositAddress)}`
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    );
  }

  if (step === "success" && successData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-8 flex flex-col items-center text-center border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              Disbursement sent
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {successData.disbursement.shopName} ·{" "}
              {successData.disbursement.bank}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">
              {successData.disbursement.city},{" "}
              {successData.disbursement.state} · Est. arrival via SPEI: within
              30 minutes
            </p>
          </div>

          <div className="px-6 py-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Settlement summary
            </p>
            <div className="grid grid-cols-2 gap-2">
              <SummaryPill
                label="On-ramp order (MTLco)"
                value={successData.onrampOrderId}
                color="green"
              />
              <SummaryPill
                label="Off-ramp order (alfredPay)"
                value={successData.offrampOrderId}
                color="green"
              />
              <SummaryPill
                label="USDC deposit address"
                value={truncateAddress(successData.depositAddress)}
              />
              <SummaryPill label="Blockchain" value={successData.blockchain} />
              <SummaryPill
                label="Seller bank"
                value={`${successData.disbursement.bank} · CLABE ...${successData.disbursement.clabe.slice(-4)}`}
              />
              <SummaryPill label="Settlement" value="DVP · SPEI" />
            </div>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => router.push(`/transactions/${successData.id}`)}
              className="flex-1 py-2.5 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              View transaction
            </button>
            <button
              onClick={() => router.push("/disbursements")}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors"
              style={{ backgroundColor: "#F1641E" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "#d9521a")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "#F1641E")
              }
            >
              Back to disbursements
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
          <div className="px-6 py-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <X className="w-9 h-9 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              Disbursement failed
            </h1>
            <p className="text-sm text-red-600 mt-2 max-w-sm">{error}</p>
            <div className="flex gap-3 mt-6 w-full max-w-xs">
              <button
                onClick={() => router.push("/disbursements")}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setStep("review");
                  setSubSteps(["pending", "pending", "pending"]);
                  setOfframpResult(null);
                  setOnrampResult(null);
                  setError(null);
                }}
                className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg"
                style={{ backgroundColor: "#F1641E" }}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
