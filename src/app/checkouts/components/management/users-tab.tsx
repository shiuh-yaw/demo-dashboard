"use client";

/**
 * Users Tab Component
 *
 * Displays a paginated list of users with their connected wallets.
 */

import { useState, useEffect } from "react";
import {
  User as UserIcon,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import type { User } from "@/lib/types/dashboard";
import { Button } from "@/components/ui/button";

interface UsersTabProps {
  checkoutId: string;
  initialUsers: User[];
  initialTotal: number;
  isLoading?: boolean;
}

const PAGE_SIZE = 10;

export function UsersTab({
  checkoutId,
  initialUsers,
  initialTotal,
  isLoading: initialLoading,
}: UsersTabProps) {
  const [users, setUsers] = useState(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(initialLoading ?? false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Fetch users when page changes
  useEffect(() => {
    async function fetchUsers() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: PAGE_SIZE.toString(),
        });

        const response = await fetch(
          `/api/checkouts/${checkoutId}/users?${params.toString()}`
        );
        if (response.ok) {
          const data = await response.json();
          setUsers(data.items);
          setTotal(data.total);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setIsLoading(false);
      }
    }

    // Skip initial fetch if we have initial data
    if (page !== 1) {
      fetchUsers();
    }
  }, [checkoutId, page]);

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-900">Users & Wallets</h3>
        <p className="text-sm text-slate-500">
          {total} user{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse divide-y divide-slate-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 h-20" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <UserIcon className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">No users yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((user) => (
              <div key={user.id} className="px-5 py-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        User {user.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-slate-500">
                        First seen{" "}
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {user.transactionCount} tx
                    </p>
                    <p className="text-xs text-slate-500">
                      {user.successfulTransactionCount} successful
                    </p>
                  </div>
                </div>

                {/* Wallets */}
                <div className="space-y-2">
                  {user.wallets.map((wallet) => (
                    <div
                      key={wallet.address}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-slate-400" />
                        <code className="text-xs text-slate-700">
                          {wallet.address.slice(0, 10)}...
                          {wallet.address.slice(-8)}
                        </code>
                        <button
                          onClick={() => copyAddress(wallet.address)}
                          className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Copy address"
                        >
                          {copiedAddress === wallet.address ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {wallet.chainIds.map((chainId) => (
                          <span
                            key={chainId}
                            className="px-1.5 py-0.5 bg-white rounded text-[10px] text-slate-500 border border-slate-200"
                          >
                            {getChainName(chainId)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className="gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// TODO: We should not hardcode the chain names
function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    1: "ETH",
    137: "Polygon",
    42161: "Arbitrum",
    10: "Optimism",
    8453: "Base",
    56: "BSC",
    43114: "Avalanche",
  };
  return chains[chainId] || `Chain ${chainId}`;
}
