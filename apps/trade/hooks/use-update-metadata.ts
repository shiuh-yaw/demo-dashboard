"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/dynamic";

async function updateMetadata(metadata: Record<string, unknown>): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/user/metadata/update", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ metadata }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to update metadata (${res.status})`);
  }
}

export function useUpdateMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMetadata,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-metadata"] });
    },
  });
}
