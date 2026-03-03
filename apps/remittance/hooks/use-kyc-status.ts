"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthToken } from "@/lib/dynamic";

export interface UseKycStatusOptions {
  /** Server-resolved KYC status. When true, skips client fetch for already-verified users. */
  initialKycApproved?: boolean;
}

/**
 * Fetches KYC approval status from Dynamic user metadata.
 * Only fetches when user is logged in.
 * When initialKycApproved is true (from server), skips fetch to avoid spinner/KYC gate.
 */
export function useKycStatus(
  isLoggedIn: boolean,
  options?: UseKycStatusOptions,
) {
  const { initialKycApproved } = options ?? {};
  const [kycApproved, setKycApproved] = useState<boolean | null>(
    initialKycApproved === true ? true : null,
  );
  const [isLoading, setIsLoading] = useState(
    initialKycApproved === true ? false : true,
  );

  const fetchStatus = useCallback(async () => {
    if (!isLoggedIn) {
      setKycApproved(null);
      setIsLoading(false);
      return;
    }

    // Already have server-confirmed KYC; skip fetch
    if (initialKycApproved === true) {
      setKycApproved(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setKycApproved(null);
        return;
      }

      const res = await fetch("/api/kyc/status", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setKycApproved(null);
        return;
      }

      const data = await res.json();
      setKycApproved(data.kycApproved === true);
    } catch {
      setKycApproved(null);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, initialKycApproved]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { kycApproved, isLoading, refetch: fetchStatus };
}
