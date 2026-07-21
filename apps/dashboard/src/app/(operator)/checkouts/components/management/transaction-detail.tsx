"use client";

/**
 * Transaction Detail Component
 *
 * Displays comprehensive information about a single transaction.
 */

import {
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useState } from "react";
import type { Transaction } from "@/lib/types/dashboard";
import { Status } from "@/lib/types/dashboard";
import { Tooltip } from "@dynamic-demos/ui";

interface TransactionDetailProps {
  transaction: Transaction;
  checkoutId: string;
}

export function TransactionDetail({
  transaction,
  checkoutId,
}: TransactionDetailProps) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  function formatAmount(
    amount: string,
    token?: Transaction["toToken"],
  ): string {
    try {
      const num = BigInt(amount);
      const tokenDecimals = token?.decimals ?? 18;
      const divisor = BigInt(10 ** tokenDecimals);
      const whole = num / divisor;
      const remainder = num % divisor;

      const decimalsStr = remainder
        .toString()
        .padStart(tokenDecimals, "0")
        .slice(0, 6);
      return `${whole}.${decimalsStr}`;
    } catch {
      return amount;
    }
  }

  function getStatusBadge(status: Transaction["status"]) {
    // Magic-send sub-states reuse the in-flight badge palette so the
    // checkout dashboard renders them consistently with `submitted`
    // and `pending`.
    const styles: Record<Transaction["status"], string> = {
      confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
      failed: "bg-red-50 text-red-700 border-red-200",
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      submitted: "bg-blue-50 text-blue-700 border-blue-200",
      draft: "bg-slate-100 text-slate-600 border-slate-200",
      initialized: "bg-slate-100 text-slate-600 border-slate-200",
      expired: "bg-slate-100 text-slate-500 border-slate-200",
      abandoned: "bg-slate-100 text-slate-500 border-slate-200",
      cancelled: "bg-slate-100 text-slate-500 border-slate-200",
      "submitted-transfer": "bg-blue-50 text-blue-700 border-blue-200",
      "transfer-confirmed": "bg-blue-50 text-blue-700 border-blue-200",
      "submitted-userop": "bg-amber-50 text-amber-700 border-amber-200",
    };
    return styles[status];
  }

  function getStatusIcon(status: Transaction["status"]) {
    if (status === Status.CONFIRMED) {
      return <CheckCircle className="w-5 h-5 text-emerald-600" />;
    }
    if (status === Status.FAILED) {
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
    return <Clock className="w-5 h-5 text-slate-400" />;
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      {/* Status Badge and Actions - Clean placement below header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-slate-500">
          Transaction ID:{" "}
          <span className="font-mono text-slate-900">{transaction.id}</span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusBadge(
              transaction.status,
            )}`}
          >
            {getStatusIcon(transaction.status)}
            <span className="text-sm font-medium capitalize">
              {transaction.status}
            </span>
          </div>
          {transaction.explorerUrl && (
            <Tooltip content="View on Block Explorer" position="top">
              <a
                href={transaction.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                aria-label="View on Block Explorer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Transaction ID
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm text-slate-900 bg-slate-50 px-2 py-1 rounded flex-1">
                    {transaction.id}
                  </code>
                  <Tooltip content="Copy transaction ID" position="top">
                    <button
                      onClick={() => copyToClipboard(transaction.id, "id")}
                      className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      aria-label="Copy transaction ID"
                    >
                      {copied === "id" ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </Tooltip>
                </div>
              </div>

              {transaction.externalId && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    External ID
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-slate-900 bg-slate-50 px-2 py-1 rounded flex-1">
                      {transaction.externalId}
                    </code>
                    <Tooltip content="Copy external ID" position="top">
                      <button
                        onClick={() =>
                          copyToClipboard(transaction.externalId!, "externalId")
                        }
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        aria-label="Copy external ID"
                      >
                        {copied === "externalId" ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </Tooltip>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Created At
                </label>
                <p className="text-sm text-slate-900 mt-1">
                  {formatDate(transaction.createdAt)}
                </p>
              </div>

              {transaction.updatedAt !== transaction.createdAt && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Last Updated
                  </label>
                  <p className="text-sm text-slate-900 mt-1">
                    {formatDate(transaction.updatedAt)}
                  </p>
                </div>
              )}

              {transaction.completedAt && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Completed At
                  </label>
                  <p className="text-sm text-slate-900 mt-1">
                    {formatDate(transaction.completedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Wallet Information */}
          {transaction.walletAddress && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                Wallet Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Wallet Address
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-slate-900 bg-slate-50 px-2 py-1 rounded flex-1 font-mono">
                      {transaction.walletAddress}
                    </code>
                    <Tooltip content="Copy wallet address" position="top">
                      <button
                        onClick={() =>
                          copyToClipboard(transaction.walletAddress!, "wallet")
                        }
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        aria-label="Copy wallet address"
                      >
                        {copied === "wallet" ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Transaction Details */}
          {(transaction.fromToken || transaction.toToken) && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                Transaction Details
              </h2>
              <div className="space-y-4">
                {transaction.fromToken && transaction.fromAmount && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      From
                    </label>
                    <div className="flex items-center gap-2 mt-2">
                      {transaction.fromToken.logoURI && (
                        <img
                          src={transaction.fromToken.logoURI}
                          alt={transaction.fromToken.symbol}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {formatAmount(
                            transaction.fromAmount,
                            transaction.fromToken,
                          )}{" "}
                          {transaction.fromToken.symbol}
                        </p>
                        {transaction.fromChainId && (
                          <p className="text-xs text-slate-500">
                            Chain ID: {transaction.fromChainId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {transaction.toToken && transaction.toAmount && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      To
                    </label>
                    <div className="flex items-center gap-2 mt-2">
                      {transaction.toToken.logoURI && (
                        <img
                          src={transaction.toToken.logoURI}
                          alt={transaction.toToken.symbol}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {formatAmount(
                            transaction.toAmount,
                            transaction.toToken,
                          )}{" "}
                          {transaction.toToken.symbol}
                        </p>
                        {transaction.toToken.priceUSD &&
                          transaction.toAmount &&
                          (() => {
                            try {
                              const amount = BigInt(transaction.toAmount);
                              const price = parseFloat(
                                transaction.toToken.priceUSD,
                              );
                              const decimals = transaction.toToken.decimals;
                              const usdValue =
                                (Number(amount) / Math.pow(10, decimals)) *
                                price;
                              return (
                                <p className="text-xs text-emerald-600 font-medium">
                                  ${usdValue.toFixed(2)} USD
                                </p>
                              );
                            } catch {
                              return null;
                            }
                          })()}
                        {transaction.toChainId && (
                          <p className="text-xs text-slate-500">
                            Chain ID: {transaction.toChainId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {transaction.tool && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Tool
                    </label>
                    <p className="text-sm text-slate-900 mt-1">
                      {transaction.tool}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Blockchain Transaction */}
          {transaction.txHash && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                Blockchain Transaction
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Transaction Hash
                  </label>
                  <div className="flex items-start gap-2 mt-1">
                    <code className="text-sm text-slate-900 bg-slate-50 px-2 py-1 rounded flex-1 font-mono break-all">
                      {transaction.txHash}
                    </code>
                    <div className="flex items-center gap-1 shrink-0">
                      {transaction.explorerUrl && (
                        <Tooltip content="View on Explorer" position="top">
                          <a
                            href={transaction.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                            aria-label="View on Explorer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Tooltip>
                      )}
                      <Tooltip content="Copy transaction hash" position="top">
                        <button
                          onClick={() =>
                            copyToClipboard(transaction.txHash!, "txHash")
                          }
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          aria-label="Copy transaction hash"
                        >
                          {copied === "txHash" ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Information */}
          {transaction.errorMessage && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-6">
              <h2 className="text-sm font-semibold text-red-900 mb-4">
                Error Information
              </h2>
              <p className="text-sm text-red-700">{transaction.errorMessage}</p>
            </div>
          )}

          {/* Metadata */}
          {transaction.metadata &&
            Object.keys(transaction.metadata).length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  Metadata
                </h2>
                <pre className="text-xs text-slate-600 bg-slate-50 p-3 rounded overflow-x-auto">
                  {JSON.stringify(transaction.metadata, null, 2)}
                </pre>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
