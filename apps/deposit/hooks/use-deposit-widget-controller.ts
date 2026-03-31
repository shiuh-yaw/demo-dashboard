"use client";

/**
 * Deposit widget — authenticated flow controller
 * ===============================================
 *
 * Phases (happy path):
 *   1. Bootstrap     Dynamic client ready; optional resume using server-read JWT
 *                      hints ({@link DepositSessionBootstrap}) for embedded address.
 *   2. Connect       User connects an external wallet → embedded wallet ensured.
 *   3. Provisioning  POST /api/vault/provision → vault + deposit addresses.
 *   4. Deposit       Main screen (addresses, deposits list).
 *
 * Guards:
 *   - `sessionProbeDone`: while on Connect, we may auto-advance signed-in users
 *     with an embedded wallet straight to Provisioning; UI stays on a loading
 *     card until that probe finishes so we don’t flash Connect then jump.
 *   - `blockAutoProvisioningAfterFailureRef`: if provision fails, we stay on
 *     Connect with `provisionError` until the user retries or reconnects —
 *     otherwise session resume would immediately re-enter Provisioning and spam
 *     the API.
 *   - Network switch: changing Base ↔ Sepolia abandons non-connect phases and
 *     returns to Connect (addresses are chain-specific).
 *
 * Instantiation: mount exactly once inside {@link DepositWidgetFlowProvider}
 * (`contexts/deposit-widget-flow-context.tsx`); phase UIs call `useDepositWidgetFlow()`.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useClientInitialized } from "@/hooks/use-client-initialized";
import {
  getAuthToken,
  isSignedIn,
  logout,
  waitForClientInitialized,
} from "@/lib/dynamic";
import { useDepositNetwork } from "@/contexts/deposit-network-context";
import { ensureEmbeddedEvmWalletAddress } from "@/lib/ensure-embedded-wallet";
import type { DepositSessionBootstrap } from "@/lib/deposit-session-bootstrap";

export type DepositWidgetScreen =
  | { type: "connect" }
  | { type: "provisioning"; embeddedWalletAddress: string }
  | {
      type: "deposit";
      vaultId: string;
      addresses: Record<string, string>;
      embeddedWalletAddress: string;
    };

export function useDepositWidgetController(
  sessionBootstrap: DepositSessionBootstrap,
) {
  const router = useRouter();
  const { network } = useDepositNetwork();
  const isClientReady = useClientInitialized();

  const [screen, setScreen] = useState<DepositWidgetScreen>({
    type: "connect",
  });
  /** False only while Connect-phase session probe is running (see effect below). */
  const [sessionProbeDone, setSessionProbeDone] = useState(false);
  /** Shown on Connect after a failed vault provision; cleared on retry / dismiss. */
  const [provisionError, setProvisionError] = useState<string | null>(null);
  /**
   * After a failed POST /api/vault/provision, session resume must not immediately
   * push back to `provisioning` (that caused a tight failure loop). Cleared on
   * explicit retry, wallet connect, network change, or logout.
   */
  const blockAutoProvisioningAfterFailureRef = useRef(false);

  const screenRef = useRef(screen);
  const networkRef = useRef(network);
  screenRef.current = screen;
  networkRef.current = network;

  // ---------------------------------------------------------------------------
  // Phase guard: network changed → always restart at Connect
  // ---------------------------------------------------------------------------
  useEffect(() => {
    blockAutoProvisioningAfterFailureRef.current = false;
    if (screenRef.current.type === "connect") return;

    setProvisionError(null);
    setScreen({ type: "connect" });
    setSessionProbeDone(false);
  }, [network]);

  // ---------------------------------------------------------------------------
  // Connect phase: session resume (signed-in + embedded wallet → skip wallet UI)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isClientReady) return;

    if (screen.type !== "connect") {
      // Not on Connect: nothing to probe; unblock any stale “waiting” flag.
      setSessionProbeDone(true);
      return;
    }

    let cancelled = false;
    setSessionProbeDone(false);

    const runSessionResume = async () => {
      await waitForClientInitialized();

      if (cancelled || screenRef.current.type !== "connect") {
        if (!cancelled) setSessionProbeDone(true);
        return;
      }

      if (!isSignedIn()) {
        if (!cancelled) setSessionProbeDone(true);
        return;
      }

      // Server already read `verified_credentials` from the JWT; when present, skip
      // client wallet account enumeration / WaaS create on resume (Connect still uses ensure).
      const jwtEmbedded = sessionBootstrap.embeddedWalletAddressFromJwt;
      const embeddedAddress =
        jwtEmbedded !== null
          ? jwtEmbedded
          : await ensureEmbeddedEvmWalletAddress();

      if (cancelled || screenRef.current.type !== "connect") {
        if (!cancelled) setSessionProbeDone(true);
        return;
      }

      if (embeddedAddress) {
        if (blockAutoProvisioningAfterFailureRef.current) {
          if (!cancelled) setSessionProbeDone(true);
          return;
        }
        setProvisionError(null);
        setScreen({
          type: "provisioning",
          embeddedWalletAddress: embeddedAddress,
        });
      }

      if (!cancelled) setSessionProbeDone(true);
    };

    void runSessionResume();
    return () => {
      cancelled = true;
    };
  }, [
    isClientReady,
    screen.type,
    sessionBootstrap.embeddedWalletAddressFromJwt,
  ]);

  // ---------------------------------------------------------------------------
  // Provisioning phase: vault + addresses (driven by screen state, not refs)
  // ---------------------------------------------------------------------------
  const provisioningAddress =
    screen.type === "provisioning" ? screen.embeddedWalletAddress : null;

  useEffect(() => {
    if (provisioningAddress === null) return;

    const embeddedWalletAddress = provisioningAddress;
    const provisionNetwork = networkRef.current;
    let cancelled = false;

    const runProvision = async () => {
      try {
        const token = await getAuthToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch("/api/vault/provision", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            embeddedWalletAddress,
            network: provisionNetwork,
          }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? "Provisioning failed");
        }

        const { vaultId, addresses } = await res.json();
        if (
          cancelled ||
          networkRef.current !== provisionNetwork ||
          screenRef.current.type !== "provisioning"
        ) {
          return;
        }

        setScreen({
          type: "deposit",
          vaultId,
          addresses,
          embeddedWalletAddress,
        });
      } catch (err) {
        if (cancelled || networkRef.current !== provisionNetwork) {
          return;
        }
        blockAutoProvisioningAfterFailureRef.current = true;
        setProvisionError(
          err instanceof Error ? err.message : "Provisioning failed",
        );
        setScreen({ type: "connect" });
      }
    };

    void runProvision();
    return () => {
      cancelled = true;
    };
  }, [provisioningAddress]);

  const handleConnected = useCallback(
    (embeddedWalletAddress: string) => {
      blockAutoProvisioningAfterFailureRef.current = false;
      setProvisionError(null);
      setScreen({ type: "provisioning", embeddedWalletAddress });
      router.refresh();
    },
    [router],
  );

  const retryProvisioning = useCallback(async () => {
    blockAutoProvisioningAfterFailureRef.current = false;
    setProvisionError(null);
    await waitForClientInitialized();
    if (!isSignedIn()) {
      setProvisionError("Session expired. Connect your wallet again.");
      blockAutoProvisioningAfterFailureRef.current = true;
      return;
    }
    const jwtEmbedded = sessionBootstrap.embeddedWalletAddressFromJwt;
    const embeddedAddress =
      jwtEmbedded !== null
        ? jwtEmbedded
        : await ensureEmbeddedEvmWalletAddress();
    if (!embeddedAddress) {
      setProvisionError(
        "Could not resolve embedded wallet. Connect your wallet again.",
      );
      blockAutoProvisioningAfterFailureRef.current = true;
      return;
    }
    setScreen({
      type: "provisioning",
      embeddedWalletAddress: embeddedAddress,
    });
  }, [sessionBootstrap.embeddedWalletAddressFromJwt]);

  const handleLogout = useCallback(async () => {
    blockAutoProvisioningAfterFailureRef.current = false;
    setProvisionError(null);
    try {
      await logout();
    } finally {
      setScreen({ type: "connect" });
      router.refresh();
    }
  }, [router]);

  const clearProvisionError = useCallback(() => {
    setProvisionError(null);
  }, []);

  const isBlockingLoad =
    !isClientReady || (screen.type === "connect" && !sessionProbeDone);

  return {
    screen,
    isBlockingLoad,
    provisionError,
    handleConnected,
    retryProvisioning,
    handleLogout,
    clearProvisionError,
  };
}
