"use client";

import { useRouter } from "next/navigation";
import { useDisbursements } from "@/contexts/disbursement-context";
import { StatusBadge } from "./status-badge";
import { COMPANY, USDC_MXN_RATE } from "@/lib/mock-data";
import { formatUSD, formatMXN, formatDate } from "@/lib/utils";
import type { Disbursement } from "@/lib/mock-data";

function MetricCard({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-xl font-semibold ${danger ? "text-red-600" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

function DisbursementCard({ d }: { d: Disbursement }) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-5 py-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono text-gray-400">{d.id}</span>
            <StatusBadge status={d.status} overdueDays={d.overdueDays} />
          </div>
          <p className="font-semibold text-sm" style={{ color: "#F1641E" }}>
            {d.shopName}
            <span className="text-gray-500 font-normal"> · {d.seller}</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {d.category} · {d.city}, {d.state}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {d.ordersCount} orders · period ending {formatDate(d.periodEnd)}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm font-semibold text-gray-900">
              {formatUSD(d.amountUSD)}
            </span>
            <span className="text-xs text-gray-400">
              ≈ {formatMXN(d.amountMXN)} · {d.bank}
            </span>
          </div>
        </div>
        <button
          onClick={() => router.push(`/payment/${d.id}`)}
          className={`shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            d.status === "overdue"
              ? "text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
          style={
            d.status === "overdue" ? { backgroundColor: "#F1641E" } : undefined
          }
          onMouseEnter={(e) => {
            if (d.status === "overdue")
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "#d9521a";
          }}
          onMouseLeave={(e) => {
            if (d.status === "overdue")
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "#F1641E";
          }}
        >
          Disburse now
        </button>
      </div>
    </div>
  );
}

export function DisbursementList() {
  const { disbursements } = useDisbursements();
  const pending = disbursements.filter((d) => d.status !== "paid");
  const overdue = pending.filter((d) => d.status === "overdue");
  const totalUSD = pending.reduce((sum, d) => sum + d.amountUSD, 0);
  const totalMXN = pending.reduce((sum, d) => sum + d.amountMXN, 0);

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      {/* ERP banner */}
      <div
        className="border-b border-orange-200 px-4 py-2.5"
        style={{ backgroundColor: "#FFF7ED" }}
      >
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: "#F1641E" }}
          />
          <p className="text-xs font-mono text-orange-800">
            {COMPANY.erpSystem} · Payment run {COMPANY.paymentRun} · {today} ·{" "}
            {pending.length} disbursement{pending.length !== 1 ? "s" : ""}{" "}
            pending
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Pending disbursements — Mexico
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {pending.length} seller{pending.length !== 1 ? "s" : ""} pending ·
            USD settlement via stablecoin sandwich · 1 USDC = {USDC_MXN_RATE}{" "}
            MXN
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <MetricCard
            label="Total pending"
            value={formatUSD(totalUSD)}
          />
          <MetricCard
            label="MXN equivalent"
            value={`≈ ${formatMXN(totalMXN)}`}
          />
          <MetricCard
            label="Overdue"
            value={`${overdue.length} seller${overdue.length !== 1 ? "s" : ""}`}
            danger={overdue.length > 0}
          />
        </div>

        <div className="space-y-3">
          {pending.map((d) => (
            <DisbursementCard key={d.id} d={d} />
          ))}
          {pending.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg font-medium">All disbursements complete</p>
              <p className="text-sm mt-1">No pending seller payments.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
