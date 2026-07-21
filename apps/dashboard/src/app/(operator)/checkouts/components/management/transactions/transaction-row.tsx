import Link from "next/link";
import { ICON_ACTION } from "@/components/shared/icon-action";
import { CheckCircle, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { Status, type Transaction } from "@/lib/types/dashboard";
import { Tooltip } from "@dynamic-demos/ui";
import { getStatusBadge, formatAmount, calculateUsdValue } from "./utils";

interface TransactionRowProps {
  transaction: Transaction;
  checkoutId: string;
}

export function TransactionRow({
  transaction,
  checkoutId,
}: TransactionRowProps) {
  const tx = transaction;

  function getStatusIcon() {
    if (tx.status === Status.CONFIRMED) {
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    }
    if (tx.status === Status.FAILED) {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
    return <Clock className="w-4 h-4 text-slate-400" />;
  }

  const usdValue =
    tx.toToken && tx.toAmount
      ? calculateUsdValue(tx.toAmount, tx.toToken.priceUSD, tx.toToken.decimals)
      : null;

  return (
    <div className="grid grid-cols-[100px_1fr_140px_150px_120px_100px_80px] px-5 py-3 items-center hover:bg-slate-50">
      {/* Date */}
      <div className="text-xs text-slate-500 flex items-center">
        {new Date(tx.createdAt).toLocaleDateString()}
      </div>

      {/* Transaction Info */}
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            tx.status === Status.CONFIRMED
              ? "bg-emerald-50"
              : tx.status === Status.FAILED
              ? "bg-red-50"
              : "bg-slate-50"
          }`}
        >
          {getStatusIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/checkouts/${checkoutId}/transactions/${tx.id}`}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline truncate block"
          >
            {tx.id.slice(0, 12)}...
          </Link>
          {tx.fromToken && tx.toToken && (
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {tx.fromToken.symbol} → {tx.toToken.symbol}
            </p>
          )}
        </div>
      </div>

      {/* External ID */}
      <div className="text-xs text-slate-600 flex items-center">
        {tx.externalId ? (
          <span className="truncate block" title={tx.externalId}>
            {tx.externalId}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </div>

      {/* Payment Amount */}
      <div className="flex flex-col gap-0.5">
        {tx.toAmount && tx.toToken ? (
          <>
            <div className="flex items-center gap-1.5">
              {tx.toToken.logoURI && (
                <img
                  src={tx.toToken.logoURI}
                  alt={tx.toToken.symbol}
                  className="w-4 h-4 rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <span className="text-xs text-slate-900 font-medium">
                {formatAmount(tx.toAmount, tx.toToken)} {tx.toToken.symbol}
              </span>
            </div>
            {usdValue !== null && (
              <span className="text-[11px] text-slate-500">
                ${usdValue.toFixed(2)}
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </div>

      {/* Wallet */}
      <div className="text-xs text-slate-600 flex items-center">
        {tx.walletAddress
          ? `${tx.walletAddress.slice(0, 6)}...${tx.walletAddress.slice(-4)}`
          : "-"}
      </div>

      {/* Status */}
      <div className="flex items-center">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium capitalize ${getStatusBadge(
            tx.status
          )}`}
        >
          {tx.status}
        </span>
      </div>

      {/* Actions */}
      <div className="flex justify-end items-center">
        {tx.explorerUrl && (
          <Tooltip content="View on Explorer" position="top">
            <a
              href={tx.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={ICON_ACTION}
              aria-label="View on Explorer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
