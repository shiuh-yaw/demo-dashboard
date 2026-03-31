"use client";

import { useQuery } from "@tanstack/react-query";
import type { DepositItem } from "@/lib/deposit-status-types";
import { getAuthToken } from "@/lib/dynamic";
import { isDepositStatusTerminal } from "@/lib/deposit-list-status";

export function useDepositStatusQuery(vaultId: string, assetId: string) {
  return useQuery({
    queryKey: ["deposit-status", vaultId, assetId],
    queryFn: async () => {
      const token = await getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(
        `/api/deposit/${vaultId}/status?asset=${assetId}`,
        { credentials: "include", headers },
      );
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json() as Promise<{
        asset: string;
        deposits: DepositItem[];
      }>;
    },
    refetchInterval: (query) => {
      const deposits = query.state.data?.deposits ?? [];
      if (deposits.length === 0) {
        return 5000;
      }
      const allTerminal = deposits.every((d) =>
        isDepositStatusTerminal(d.status),
      );
      return allTerminal ? false : 5000;
    },
  });
}
