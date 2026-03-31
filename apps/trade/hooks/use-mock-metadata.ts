"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MOCK_METADATA_STORAGE_KEY } from "@/lib/mock-metadata";

function getMockMetadataFromStorage(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MOCK_METADATA_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function setMockMetadataToStorage(metadata: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MOCK_METADATA_STORAGE_KEY, JSON.stringify(metadata));
}

function mockDelay(): Promise<void> {
  const ms = 500 + Math.random() * 500; // 500–1000ms
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Read and write mock metadata (trade, earn, predict) from localStorage.
 * Use this instead of useUserMetadata + useUpdateMetadata when in mock mode.
 */
export function useMockMetadata() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["mock-metadata"],
    queryFn: getMockMetadataFromStorage,
    staleTime: 0,
  });

  const updateMutation = useMutation({
    mutationFn: async (partial: Record<string, unknown>) => {
      await mockDelay();
      const current = getMockMetadataFromStorage();
      const merged = { ...current, ...partial };
      setMockMetadataToStorage(merged);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mock-metadata"] });
    },
  });

  return {
    metadata: query.data ?? {},
    updateMetadata: updateMutation,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
