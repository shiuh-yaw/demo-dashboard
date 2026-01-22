/**
 * Overview Tab Component (Server Component)
 *
 * Displays checkout statistics and recent activity.
 */

import {
  ArrowLeftRight,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Status, type Stats, type Transaction } from "@/lib/types/dashboard";

interface OverviewTabProps {
  stats: Stats | null;
  recentTransactions: Transaction[];
}

export function OverviewTab({ stats, recentTransactions }: OverviewTabProps) {
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
    {
      label: "Avg. Completion",
      value: stats?.avgCompletionTimeSeconds
        ? `${stats.avgCompletionTimeSeconds}s`
        : "N/A",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
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

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Transactions by Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(stats.transactionsByStatus).map(
              ([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <span className="text-xs text-slate-600 capitalize">
                    {status}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {count}
                  </span>
                </div>
              )
            )}
          </div>
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
              <div
                key={tx.id}
                className="px-5 py-3 flex items-center justify-between"
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
                    <p className="text-sm font-medium text-slate-900">
                      {tx.walletAddress
                        ? `${tx.walletAddress.slice(
                            0,
                            6
                          )}...${tx.walletAddress.slice(-4)}`
                        : "Unknown"}
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
