"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useDisbursements } from "@/contexts/disbursement-context";
import { SandwichRoute } from "./sandwich-route";
import { formatUSD, formatMXN, formatDate, formatDateTime, truncateAddress } from "@/lib/utils";

interface TransactionDetailProps {
  id: string;
}

function DetailCell({ label, value, mono, green }: { label: string; value: string; mono?: boolean; green?: boolean }) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm ${mono ? "font-mono" : ""} ${green ? "text-green-700" : "text-gray-800"}`}>
        {value}
      </p>
    </div>
  );
}

export function TransactionDetail({ id }: TransactionDetailProps) {
  const { transactions } = useDisbursements();
  const tx = transactions.find((t) => t.id === id);

  if (!tx) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Transaction not found.</p>
        <Link
          href="/transactions"
          className="mt-4 inline-block text-sm hover:underline"
          style={{ color: "#F1641E" }}
        >
          Back to transactions
        </Link>
      </div>
    );
  }

  const d = tx.disbursement;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/transactions"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to transactions
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                Paid
              </span>
              <span className="text-sm text-gray-400">
                {formatDateTime(tx.paidAt)}
              </span>
            </div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "#F1641E" }}
            >
              {d.shopName}
            </h1>
            <p className="text-gray-600 mt-0.5">{d.seller}</p>
            <p className="text-sm text-gray-400 mt-0.5">
              {d.city}, {d.state} · {d.category}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-gray-900">
              {formatUSD(d.amountUSD)}
            </p>
            <p className="text-sm text-gray-500">
              → {formatMXN(d.amountMXN)}
            </p>
          </div>
        </div>

        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Payment route
        </p>
        <SandwichRoute
          depositAddress={tx.depositAddress}
          sellerBank={d.bank}
          blockchain={tx.blockchain}
        />
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Disbursement details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Disbursement details
          </h2>
          <DetailCell label="Disbursement ID" value={tx.id} mono />
          <DetailCell
            label="Orders"
            value={String(d.ordersCount)}
          />
          <DetailCell
            label="Period"
            value={formatDate(d.periodEnd)}
          />
          <DetailCell label="USD amount" value={formatUSD(d.amountUSD)} />
          <DetailCell label="MXN amount" value={formatMXN(d.amountMXN)} />
          <DetailCell
            label="FX rate"
            value={`1 USDC = ${tx.rate} MXN`}
          />
          <DetailCell
            label="USDC amount"
            value={`${d.amountUSDC} USDC (Ethereum)`}
          />
        </div>

        {/* Settlement details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Settlement details
          </h2>
          <DetailCell
            label="Off-ramp order (alfredPay)"
            value={tx.offrampOrderId}
            mono
            green
          />
          <DetailCell
            label="On-ramp order (MTLco)"
            value={tx.onrampOrderId}
            mono
            green
          />
          <DetailCell
            label="Deposit address"
            value={truncateAddress(tx.depositAddress)}
            mono
          />
          <DetailCell label="Blockchain" value={tx.blockchain} />
          <DetailCell label="Settlement" value="DVP · SPEI" />
          <DetailCell label="Paid at" value={formatDateTime(tx.paidAt)} />
        </div>
      </div>

      {/* Recipient */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Recipient
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <DetailCell label="Recipient" value={d.recipient} />
          <DetailCell label="Bank" value={d.bank} />
          <DetailCell label="CLABE" value={d.clabe} mono />
        </div>
      </div>

      <div className="mt-6">
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg px-4 py-2.5 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to transactions
        </Link>
      </div>
    </div>
  );
}
