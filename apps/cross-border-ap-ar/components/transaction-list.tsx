"use client";

import Link from "next/link";
import { useDisbursements } from "@/contexts/disbursement-context";
import { COMPANY } from "@/lib/mock-data";
import { formatUSD, formatMXN, formatDateTime, truncateAddress } from "@/lib/utils";

export function TransactionList() {
  const { transactions } = useDisbursements();

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
            {transactions.length} disbursement
            {transactions.length !== 1 ? "s" : ""} completed
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Transaction history
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Completed disbursements
          </p>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-500 font-medium">
              No disbursements completed yet.
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Disburse a seller payment to see it here.
            </p>
            <Link
              href="/disbursements"
              className="inline-block mt-4 text-sm font-medium hover:underline"
              style={{ color: "#F1641E" }}
            >
              Go to disbursements →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <Link
                key={tx.id}
                href={`/transactions/${tx.id}`}
                className="block bg-white rounded-lg border border-gray-200 px-5 py-4 hover:border-gray-300 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono text-gray-400">
                        {tx.id}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        Paid
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {formatDateTime(tx.paidAt)}
                      </span>
                    </div>
                    <p
                      className="font-semibold text-sm"
                      style={{ color: "#F1641E" }}
                    >
                      {tx.disbursement.shopName}
                      <span className="text-gray-500 font-normal">
                        {" "}
                        · {tx.disbursement.recipient}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {tx.disbursement.category} · {tx.disbursement.city},{" "}
                      {tx.disbursement.state}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatUSD(tx.disbursement.amountUSD)}
                      </span>
                      <span className="text-xs text-gray-400">
                        → {formatMXN(tx.disbursement.amountMXN)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {tx.disbursement.bank}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[10px] font-mono text-gray-400">
                        alfredPay: {tx.offrampOrderId}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">
                        MTLco: {tx.onrampOrderId}
                      </span>
                    </div>
                  </div>
                  <span
                    className="text-sm font-medium shrink-0 group-hover:underline"
                    style={{ color: "#F1641E" }}
                  >
                    View details →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
