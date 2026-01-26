/**
 * Overview Tab Component (Server Component)
 *
 * Displays checkout statistics and recent activity.
 */

import Link from "next/link";
import {
  ArrowLeftRight,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Activity,
} from "lucide-react";
import { Status, type Stats, type Transaction } from "@/lib/types/dashboard";

interface OverviewTabProps {
  stats: Stats | null;
  recentTransactions: Transaction[];
  checkoutId: string;
}

export function OverviewTab({
  stats,
  recentTransactions,
  checkoutId,
}: OverviewTabProps) {
  const statCards = [
    {
      label: "Total Transactions",
      value: stats?.totalTransactions ?? 0,
      icon: ArrowLeftRight,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Success Rate",
      value: stats ? `${Math.round(stats.successRate * 100)}%` : "0%",
      icon: TrendingUp,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
    },
  ];

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      confirmed: "bg-emerald-50 text-emerald-700",
      failed: "bg-red-50 text-red-700",
      pending: "bg-amber-50 text-amber-700",
      submitted: "bg-blue-50 text-blue-700",
      draft: "bg-slate-50 text-slate-600",
      initialized: "bg-slate-50 text-slate-600",
      expired: "bg-slate-50 text-slate-500",
      abandoned: "bg-slate-50 text-slate-500",
    };
    return styles[status] || "bg-slate-50 text-slate-600";
  }

  function getStatusDotColor(status: string) {
    const colors: Record<string, string> = {
      confirmed: "bg-emerald-500",
      failed: "bg-red-500",
      pending: "bg-amber-500",
      submitted: "bg-blue-500",
      draft: "bg-slate-400",
      initialized: "bg-slate-400",
      expired: "bg-slate-300",
      abandoned: "bg-slate-300",
      cancelled: "bg-slate-300",
    };
    return colors[status] || "bg-slate-400";
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 p-5"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-xl font-semibold text-slate-900">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Breakdown */}
      {stats && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">
                Transaction Health
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              {stats.totalTransactions} total
            </span>
          </div>

          {/* Key Metrics */}
          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${
              Object.entries(stats.transactionsByStatus).filter(
                ([_, count]) => (count ?? 0) > 0
              ).length > 0
                ? "mb-6"
                : ""
            }`}
          >
            {/* Successful */}
            <Link
              href={`/checkouts/${checkoutId}/transactions?status=${Status.CONFIRMED}`}
              className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 border border-emerald-200/50 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-emerald-700">
                  Successful
                </span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-900 group-hover:text-emerald-800 transition-colors">
                  {stats.transactionsByStatus.confirmed ?? 0}
                </span>
                {stats.totalTransactions > 0 && (
                  <span className="text-sm text-emerald-700">
                    (
                    {Math.round(
                      ((stats.transactionsByStatus.confirmed ?? 0) /
                        stats.totalTransactions) *
                        100
                    )}
                    %)
                  </span>
                )}
              </div>
              {stats.totalTransactions > 0 && (
                <div className="mt-3 h-1.5 bg-emerald-200/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{
                      width: `${
                        ((stats.transactionsByStatus.confirmed ?? 0) /
                          stats.totalTransactions) *
                        100
                      }%`,
                    }}
                  />
                </div>
              )}
            </Link>

            {/* In Progress */}
            <Link
              href={`/checkouts/${checkoutId}/transactions?status=${Status.PENDING},${Status.SUBMITTED},${Status.DRAFT},${Status.INITIALIZED}`}
              className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 border border-blue-200/50 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-700">
                  In Progress
                </span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-900 group-hover:text-blue-800 transition-colors">
                  {(stats.transactionsByStatus.pending ?? 0) +
                    (stats.transactionsByStatus.submitted ?? 0) +
                    (stats.transactionsByStatus.draft ?? 0) +
                    (stats.transactionsByStatus.initialized ?? 0)}
                </span>
                {stats.totalTransactions > 0 && (
                  <span className="text-sm text-blue-700">
                    (
                    {Math.round(
                      (((stats.transactionsByStatus.pending ?? 0) +
                        (stats.transactionsByStatus.submitted ?? 0) +
                        (stats.transactionsByStatus.draft ?? 0) +
                        (stats.transactionsByStatus.initialized ?? 0)) /
                        stats.totalTransactions) *
                        100
                    )}
                    %)
                  </span>
                )}
              </div>
              {stats.totalTransactions > 0 && (
                <div className="mt-3 h-1.5 bg-blue-200/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{
                      width: `${
                        (((stats.transactionsByStatus.pending ?? 0) +
                          (stats.transactionsByStatus.submitted ?? 0) +
                          (stats.transactionsByStatus.draft ?? 0) +
                          (stats.transactionsByStatus.initialized ?? 0)) /
                          stats.totalTransactions) *
                        100
                      }%`,
                    }}
                  />
                </div>
              )}
            </Link>

            {/* Failed */}
            <Link
              href={`/checkouts/${checkoutId}/transactions?status=${Status.FAILED},${Status.EXPIRED},${Status.ABANDONED},${Status.CANCELLED}`}
              className="relative overflow-hidden rounded-lg bg-gradient-to-br from-red-50 to-red-100/50 p-4 border border-red-200/50 hover:border-red-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-red-700">Failed</span>
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-red-900 group-hover:text-red-800 transition-colors">
                  {(stats.transactionsByStatus.failed ?? 0) +
                    (stats.transactionsByStatus.expired ?? 0) +
                    (stats.transactionsByStatus.abandoned ?? 0) +
                    (stats.transactionsByStatus.cancelled ?? 0)}
                </span>
                {stats.totalTransactions > 0 && (
                  <span className="text-sm text-red-700">
                    (
                    {Math.round(
                      (((stats.transactionsByStatus.failed ?? 0) +
                        (stats.transactionsByStatus.expired ?? 0) +
                        (stats.transactionsByStatus.abandoned ?? 0) +
                        (stats.transactionsByStatus.cancelled ?? 0)) /
                        stats.totalTransactions) *
                        100
                    )}
                    %)
                  </span>
                )}
              </div>
              {stats.totalTransactions > 0 && (
                <div className="mt-3 h-1.5 bg-red-200/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 rounded-full transition-all"
                    style={{
                      width: `${
                        (((stats.transactionsByStatus.failed ?? 0) +
                          (stats.transactionsByStatus.expired ?? 0) +
                          (stats.transactionsByStatus.abandoned ?? 0) +
                          (stats.transactionsByStatus.cancelled ?? 0)) /
                          stats.totalTransactions) *
                        100
                      }%`,
                    }}
                  />
                </div>
              )}
            </Link>
          </div>

          {/* Detailed Status List */}
          {Object.entries(stats.transactionsByStatus).filter(
            ([_, count]) => (count ?? 0) > 0
          ).length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-3">
                Status Breakdown
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(stats.transactionsByStatus)
                  .filter(([_, count]) => (count ?? 0) > 0)
                  .sort(([_, a], [__, b]) => (b ?? 0) - (a ?? 0))
                  .map(([status, count]) => {
                    const safeCount = count ?? 0;
                    const percentage =
                      stats.totalTransactions > 0
                        ? Math.round(
                            (safeCount / stats.totalTransactions) * 100
                          )
                        : 0;
                    return (
                      <Link
                        key={status}
                        href={`/checkouts/${checkoutId}/transactions?status=${status}`}
                        className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-2 h-2 rounded-full shrink-0 ${getStatusDotColor(
                              status
                            )}`}
                          />
                          <span className="text-xs text-slate-700 capitalize truncate group-hover:text-blue-600 transition-colors">
                            {status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-xs font-semibold text-slate-900">
                            {safeCount}
                          </span>
                          <span className="text-xs text-slate-400">
                            {percentage}%
                          </span>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">
            Recent Activity
          </h3>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <ArrowLeftRight className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.slice(0, 5).map((tx) => (
              <Link
                key={tx.id}
                href={`/checkouts/${checkoutId}/transactions/${tx.id}`}
                className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.status === Status.CONFIRMED
                        ? "bg-emerald-50"
                        : tx.status === Status.FAILED
                        ? "bg-red-50"
                        : "bg-slate-50"
                    }`}
                  >
                    {tx.status === Status.CONFIRMED ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : tx.status === Status.FAILED ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                      {tx.walletAddress
                        ? `${tx.walletAddress.slice(
                            0,
                            6
                          )}...${tx.walletAddress.slice(-4)}`
                        : tx.id.slice(0, 12) + "..."}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${getStatusBadge(
                      tx.status
                    )}`}
                  >
                    {tx.status}
                  </span>
                  {tx.fromAmount && (
                    <p className="text-xs text-slate-500 mt-1">
                      {tx.fromAmount}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
