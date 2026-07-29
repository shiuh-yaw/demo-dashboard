"use client";

/**
 * Rain card-secret reveal. The dashboard never sees the plaintext PAN/CVC -
 * it only relays the opaque RSA-wrapped `sessionId` (hard rule 3). The
 * browser generates the AES key, sends `sessionId` to
 * `/api/rain/card-details` via `dashboardPost`, then decrypts the
 * `encryptedPan`/`encryptedCvc` payloads locally with `decryptSecret`. The
 * secret plaintext lives only in this hook's state, never server-side.
 */

import { useCallback, useState } from "react";
import { useDynamicClient } from "@dynamic-labs-sdk/react-hooks";
import type { CardEncryptedDataResponse } from "@dynamic-demos/rain";

import { useTrack } from "@dynamic-demos/analytics";
import { dashboardPost } from "@/lib/dashboard-api";
import { useRainCardStore, rainCardRef } from "@dynamic-demos/rain/client";
import { generateSessionId } from "@/lib/rain-crypto/generate-session-id";
import { decryptSecret } from "@/lib/rain-crypto/decrypt-secret";

interface UseCardDetailsResult {
  reveal: () => Promise<void>;
  hide: () => void;
  pan: string | null;
  cvc: string | null;
  isRevealing: boolean;
  error: string | null;
}

export function useCardDetails(): UseCardDetailsResult {
  const client = useDynamicClient();
  const { card } = useRainCardStore();
  const { milestone } = useTrack();
  const [pan, setPan] = useState<string | null>(null);
  const [cvc, setCvc] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reveal = useCallback(async () => {
    setIsRevealing(true);
    setError(null);
    try {
      const { secretKey, sessionId } = await generateSessionId();

      const { encryptedData } = await dashboardPost<{
        encryptedData: CardEncryptedDataResponse;
      }>("/api/rain/card-details", client?.token, { sessionId }, rainCardRef(card));

      const [decryptedPan, decryptedCvc] = await Promise.all([
        decryptSecret(
          encryptedData.encryptedPan.data,
          encryptedData.encryptedPan.iv,
          secretKey,
        ),
        decryptSecret(
          encryptedData.encryptedCvc.data,
          encryptedData.encryptedCvc.iv,
          secretKey,
        ),
      ]);

      setPan(decryptedPan);
      setCvc(decryptedCvc);
      // Fires only after a successful decrypt - never on error.
      milestone("card_details_revealed");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reveal card details",
      );
    } finally {
      setIsRevealing(false);
    }
  }, [client, card, milestone]);

  const hide = useCallback(() => {
    setPan(null);
    setCvc(null);
    setError(null);
  }, []);

  return { reveal, hide, pan, cvc, isRevealing, error };
}
