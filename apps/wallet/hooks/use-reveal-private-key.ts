"use client";

/**
 * Private-key reveal for ONE wallet, gated on the WalletWaasExport step-up.
 *
 * The SDK injects a secure iframe into a container we hand it, so the key
 * never passes through app code. That container must already be in the DOM
 * when the reveal fires, so the consuming screen keeps it mounted and hidden.
 */

import { useCallback, useRef, useState } from "react";
import { exportWaasPrivateKey, mintMfaToken } from "@/lib/dynamic";
import type { WalletAccount } from "@/lib/dynamic";
import { useExportStepUp } from "@/hooks/use-mfa-status";

export interface RevealPrivateKey {
  /** Attach to the always-mounted container the SDK injects into. */
  containerRef: (element: HTMLDivElement | null) => void;
  isRevealed: boolean;
  /** Nothing is enrolled, so enrollment is the only way through. */
  needsMfaSetup: boolean;
  /** A TOTP code is being collected before the reveal can run. */
  awaitingCode: boolean;
  code: string;
  setCode: (code: string) => void;
  isVerifying: boolean;
  error: unknown;
  reveal: () => void;
  submitCode: () => Promise<void>;
  cancelCode: () => void;
  hide: () => void;
}

export function useRevealPrivateKey(
  walletAccount: WalletAccount,
  { onNeedsMfaSetup }: { onNeedsMfaSetup: () => void },
): RevealPrivateKey {
  const {
    needsEnrollment: needsMfaSetup,
    requiresStepUp,
    stepUpMethod,
    canUseTotpInstead,
    switchToTotp,
  } = useExportStepUp();

  const container = useRef<HTMLDivElement | null>(null);
  const [isRevealed, setRevealed] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState("");
  const [isVerifying, setVerifying] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  const containerRef = useCallback((element: HTMLDivElement | null) => {
    container.current = element;
  }, []);

  const inject = useCallback(async () => {
    const target = container.current;
    // Never return quietly: a reveal that does nothing at all reads as a
    // dead button, and this container is the one thing the SDK needs.
    if (!target) {
      setError(new Error("The secure container is not ready. Try again."));
      return;
    }
    setError(undefined);
    target.replaceChildren();
    setRevealed(true);
    try {
      // Paint first. React has not flushed `isRevealed` yet, so the container
      // is still display:none, and the SDK sizes its iframe against it.
      await new Promise(requestAnimationFrame);
      await exportWaasPrivateKey({ walletAccount, displayContainer: target });
    } catch (caught) {
      setRevealed(false);
      setError(caught);
    }
  }, [walletAccount]);

  const submitCode = useCallback(async () => {
    if (!stepUpMethod || isVerifying) return;
    if (stepUpMethod === "totp" && code.length !== 6) return;
    setVerifying(true);
    try {
      await mintMfaToken({ method: stepUpMethod, code: code || undefined });
      setAwaitingCode(false);
      setCode("");
      await inject();
    } catch (caught) {
      setCode("");
      setError(caught);
      // A passkey that is not on this device cannot succeed however many
      // times it is retried, so drop to the code rather than loop.
      if (stepUpMethod === "passkey" && canUseTotpInstead) {
        switchToTotp();
        setAwaitingCode(true);
      } else {
        setAwaitingCode(false);
      }
    } finally {
      setVerifying(false);
    }
  }, [canUseTotpInstead, code, inject, isVerifying, stepUpMethod, switchToTotp]);

  const reveal = useCallback(() => {
    if (needsMfaSetup) {
      onNeedsMfaSetup();
      return;
    }
    // TOTP needs a code collected first; a passkey prompts immediately, so
    // there is nothing to show between the click and the OS dialog.
    if (requiresStepUp && stepUpMethod === "totp") {
      setError(undefined);
      setCode("");
      setAwaitingCode(true);
      return;
    }
    if (requiresStepUp && stepUpMethod === "passkey") {
      void submitCode();
      return;
    }
    void inject();
  }, [
    inject,
    needsMfaSetup,
    onNeedsMfaSetup,
    requiresStepUp,
    stepUpMethod,
    submitCode,
  ]);

  const cancelCode = useCallback(() => {
    setAwaitingCode(false);
    setCode("");
  }, []);

  const hide = useCallback(() => {
    setAwaitingCode(false);
    container.current?.replaceChildren();
    setRevealed(false);
  }, []);

  return {
    containerRef,
    isRevealed,
    needsMfaSetup,
    awaitingCode,
    code,
    setCode,
    isVerifying,
    error,
    reveal,
    submitCode,
    cancelCode,
    hide,
  };
}
