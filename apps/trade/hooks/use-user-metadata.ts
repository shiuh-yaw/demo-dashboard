"use client";

import { useQuery } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/dynamic";
import type { DynamicWallet } from "@dynamic-demos/dynamic";

interface UserMetadataResponse {
  metadata: Record<string, unknown>;
  userId: string;
  wallets: DynamicWallet[];
}

async function fetchUserMetadata(): Promise<UserMetadataResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/user/metadata", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch metadata (${res.status})`);
  }
  return res.json();
}

export function useUserMetadata(options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: ["user-metadata"],
    queryFn: fetchUserMetadata,
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });

  return {
    metadata: query.data?.metadata ?? {},
    wallets: query.data?.wallets ?? [],
    userId: query.data?.userId ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
