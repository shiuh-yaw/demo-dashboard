"use client";

import { useCallback, useRef, useState } from "react";
import { isEvmWalletAccount } from "@dynamic-labs-sdk/evm";
import {
  waitForClientInitialized,
  getSmartWalletAccount,
  createKernelClientForWalletAccount,
  signEip7702Authorization,
  confirmWithPasskeyMFA,
  hasRegisteredPasskeys,
  registerPasskey,
} from "@/lib/dynamic";
import { isSmartAccountDelegated } from "@/lib/chain";

/**
 * Canonical phase lifecycle for an MFA-gated smart-account transaction.
 *
 * Both the Transfer flow and the demo mint-payout flow go through the same
 * stations. UI layers can listen to phase changes to render appropriate copy
 * ("Activate your wallet", "Confirm with Touch ID", "Pushing on-chain…").
 */
export type SmartAccountTxPhase =
  | "idle"
  | "checking"
  | "registering_passkey"
  | "activating"
  | "confirming"
  | "sending"
  | "success"
  | "error";

export interface SmartAccountTxRequest {
  to: `0x${string}`;
  data: `0x${string}`;
  value?: bigint;
  chainId: number;
}

export interface UseSmartAccountTxOptions {
  onPhaseChange?: (phase: SmartAccountTxPhase) => void;
  onSuccess?: (hash: string) => void;
  onError?: (err: Error) => void;
  /**
   * If true, auto-prompt to register a passkey when none is found.
   * Defaults to true.
   */
  autoRegisterPasskey?: boolean;
}

/**
 * Runs a transaction against the developer's ZeroDev smart account.
 *
 *  1. Ensures a passkey is registered (auto-register if missing).
 *  2. Checks whether the EOA has already been EIP-7702 delegated.
 *  3. If not delegated → one MFA confirmation + signEip7702Authorization
 *     (first-time activation on this chain).
 *  4. One MFA confirmation that authorizes user-operation signing.
 *  5. Builds a kernel client (passing the pre-signed 7702 auth only when we
 *     signed one above) and sends the tx.
 *
 * Nonce management is handled entirely by ZeroDev; this hook must not double-
 * submit a UserOperation. A ref-based re-entrancy guard short-circuits any
 * second `execute` call while a first call is still in flight (prevents the
 * AA25 "same sender and nonce" bundler rejection that surfaces when a button
 * fires twice before its `disabled` prop has propagated).
 */
export function useSmartAccountTx(options?: UseSmartAccountTxOptions) {
  const [phase, setPhaseState] = useState<SmartAccountTxPhase>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Re-entrancy guard. A ref (not state) so it's synchronous — a second
  // click that races the first before React rerenders still short-circuits.
  const inFlightRef = useRef(false);

  // Stash options in a ref so the `execute` callback identity stays stable
  // across renders. This avoids stale-closure issues while also keeping us
  // from creating new kernel clients just because the caller passed an
  // inline options object on every render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const setPhase = useCallback((next: SmartAccountTxPhase) => {
    setPhaseState(next);
    optionsRef.current?.onPhaseChange?.(next);
  }, []);

  const execute = useCallback(
    async (req: SmartAccountTxRequest): Promise<string> => {
      if (inFlightRef.current) {
        // Silently ignore the double-click rather than raising — the first
        // call is still in flight and will resolve normally.
        throw new Error(
          "A transaction is already in progress. Wait for it to finish.",
        );
      }
      inFlightRef.current = true;

      setError(null);
      setTxHash(null);
      setPhase("checking");

      try {
        await waitForClientInitialized();

        const smartWallet = getSmartWalletAccount();
        if (!smartWallet) {
          throw new Error(
            "Smart wallet not available yet. Create your stablecoin wallet first.",
          );
        }
        if (!isEvmWalletAccount(smartWallet)) {
          throw new Error("Use an EVM wallet for this operation.");
        }

        // 1. Passkey gate — every MFA path needs at least one registered.
        const hasPasskey = await hasRegisteredPasskeys();
        if (!hasPasskey) {
          const shouldRegister =
            optionsRef.current?.autoRegisterPasskey ?? true;
          if (!shouldRegister) {
            throw new Error(
              "Biometric passkey not registered. Set up Touch ID first.",
            );
          }
          setPhase("registering_passkey");
          await registerPasskey();
        }

        // 2. EIP-7702 delegation — only on chains where Pectra is live.
        //    On EIP-4337 chains (e.g. Polygon) the kernel deploys itself as
        //    part of the first UserOperation; no delegation signing needed.
        const EIP_7702_CHAINS = new Set([1, 11155111, 84532]);

        let eip7702Auth:
          | Awaited<ReturnType<typeof signEip7702Authorization>>
          | undefined;

        if (EIP_7702_CHAINS.has(req.chainId)) {
          const isDelegated = await isSmartAccountDelegated(
            smartWallet.address as `0x${string}`,
            req.chainId,
          );
          if (!isDelegated) {
            setPhase("activating");
            await confirmWithPasskeyMFA();
            eip7702Auth = await signEip7702Authorization({
              smartWalletAccount: smartWallet,
            });
          }
        }

        // 3. Final confirmation that authorizes signing of the user op.
        setPhase("confirming");
        await confirmWithPasskeyMFA();

        setPhase("sending");
        const kernelClient = await createKernelClientForWalletAccount({
          smartWalletAccount: smartWallet,
          networkId: String(req.chainId),
          ...(eip7702Auth ? { eip7702Auth } : {}),
        });

        const hash = await kernelClient.sendTransaction({
          to: req.to,
          data: req.data,
          value: req.value ?? BigInt(0),
        });

        setTxHash(hash);
        setPhase("success");
        optionsRef.current?.onSuccess?.(hash);
        return hash;
      } catch (e: unknown) {
        const err =
          e instanceof Error ? e : new Error("Transaction failed");
        console.error("[SmartAccountTx] raw error:", err.message, e);
        setError(err);
        setPhase("error");
        optionsRef.current?.onError?.(err);
        throw err;
      } finally {
        inFlightRef.current = false;
      }
    },
    [setPhase],
  );

  const reset = useCallback(() => {
    setPhaseState("idle");
    setTxHash(null);
    setError(null);
  }, []);

  const isPending =
    phase !== "idle" && phase !== "success" && phase !== "error";

  return {
    phase,
    isPending,
    txHash,
    error,
    execute,
    reset,
  };
}
