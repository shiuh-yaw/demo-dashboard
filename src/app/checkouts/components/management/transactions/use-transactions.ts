import { useState, useEffect, useRef } from "react";
import {
  type Transaction,
  type TransactionStatus,
} from "@/lib/types/dashboard";
import { env } from "@/env";
import { PAGE_SIZE } from "./constants";

interface UseTransactionsOptions {
  checkoutId: string;
  initialTransactions: Transaction[];
  initialTotal: number;
  initialLoading?: boolean;
}

export function useTransactions({
  checkoutId,
  initialTransactions,
  initialTotal,
  initialLoading,
}: UseTransactionsOptions) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(initialLoading ?? false);
  const skipInitialFetch = useRef(true);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Fetch transactions when page, filter, or search changes
  useEffect(() => {
    // Skip fetch on initial mount - use initialTransactions
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

    async function fetchTransactions() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: PAGE_SIZE.toString(),
        });
        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }

        // Add external ID search param
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery) {
          params.set("externalId", trimmedQuery);
        }

        const response = await fetch(
          `/api/checkouts/${checkoutId}/transactions?${params.toString()}`,
          {
            headers: {
              "X-Dynamic-Environment-Id":
                env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setTransactions(data.items);
          setTotal(data.total);
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTransactions();
  }, [checkoutId, page, statusFilter, searchQuery]);

  const handleStatusChange = (status: TransactionStatus | "all") => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return {
    transactions,
    total,
    page,
    totalPages,
    statusFilter,
    searchQuery,
    isLoading,
    handleStatusChange,
    handleSearchChange,
    handlePageChange,
  };
}
