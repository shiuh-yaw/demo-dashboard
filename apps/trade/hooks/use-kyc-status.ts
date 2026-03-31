"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/dynamic";

interface KycStatusResponse {
  kycApproved: boolean;
}

async function fetchKycStatus(): Promise<KycStatusResponse> {
  const token = await getAuthToken();
  if (!token) return { kycApproved: false };

  const res = await fetch("/api/kyc/status", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { kycApproved: false };
  return res.json();
}

export function useKycStatus() {
  const query = useQuery({
    queryKey: ["kyc-status"],
    queryFn: fetchKycStatus,
    staleTime: 30 * 1000,
  });

  return {
    kycApproved: query.data?.kycApproved ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

async function approveKyc(): Promise<void> {
  const token = await getAuthToken().catch(() => null);
  const headers: HeadersInit =
    token && typeof token === "string" ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch("/api/kyc/approve", {
    method: "POST",
    headers,
    credentials: "same-origin",
  });
  if (!res.ok) {
    const text = await res.text();
    let message = `Verification failed (${res.status})`;
    try {
      const json = JSON.parse(text) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
}

export function useApproveKyc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveKyc,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc-status"] });
    },
  });
}
