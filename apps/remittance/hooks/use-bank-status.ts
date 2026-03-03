"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthToken } from "@/lib/dynamic";

/**
 * Fetches bank details submitted status from Dynamic user metadata.
 * Only fetches when user is logged in.
 */
export function useBankStatus(isLoggedIn: boolean) {
  const [hasSubmittedBankDetails, setHasSubmittedBankDetails] = useState<
    boolean | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!isLoggedIn) {
      setHasSubmittedBankDetails(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setHasSubmittedBankDetails(null);
        return;
      }

      const res = await fetch("/api/withdraw/bank-status", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setHasSubmittedBankDetails(null);
        return;
      }

      const data = await res.json();
      setHasSubmittedBankDetails(data.hasSubmittedBankDetails === true);
    } catch {
      setHasSubmittedBankDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { hasSubmittedBankDetails, isLoading, refetch: fetchStatus };
}
