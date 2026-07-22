"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/dynamic";
import type { RecipientEntry } from "@/lib/recipients";

const RECIPIENTS_QUERY_KEY = ["recipients"];

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

export type { RecipientEntry };

export function useRecipients(initialRecipients?: RecipientEntry[]) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: RECIPIENTS_QUERY_KEY,
    queryFn: async () => {
      const res = await fetchWithAuth("/api/recipients");
      if (!res.ok) throw new Error("Failed to fetch recipients");
      const json = await res.json();
      return (json.recipients ?? []) as RecipientEntry[];
    },
    initialData: initialRecipients,
  });

  return {
    recipients: data ?? initialRecipients ?? [],
    isLoading: isLoading && initialRecipients === undefined,
    refetch,
  };
}

export function useAddRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetchWithAuth("/api/recipients", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to add recipient");
      }
      return res.json() as Promise<{ address?: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECIPIENTS_QUERY_KEY });
    },
  });
}

export function useRemoveRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetchWithAuth("/api/recipients", {
        method: "DELETE",
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to remove recipient");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECIPIENTS_QUERY_KEY });
    },
  });
}

export function useClearRecipients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth("/api/recipients", {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to clear recipients");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECIPIENTS_QUERY_KEY });
    },
  });
}

export function useResolveRecipient() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetchWithAuth("/api/recipients/resolve", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to resolve recipient");
      }
      const json = await res.json();
      return json.address as string;
    },
  });
}
