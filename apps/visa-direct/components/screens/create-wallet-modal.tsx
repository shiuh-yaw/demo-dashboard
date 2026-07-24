"use client";

import { useState, useEffect, useRef } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@dynamic-demos/ui";
import { useTrack } from "@dynamic-demos/analytics";
import {
  createWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts,
  getPrimarySmartEvmAccount,
  onEvent,
  offEvent,
} from "@/lib/dynamic";
import { usePayoutContext } from "@/contexts/payout-context";
import { useActiveNetwork } from "@/hooks/use-active-network";

type Step = "confirm" | "creating" | "done" | "error";

/**
 * How long the success card lingers before the modal auto-closes.
 * The countdown ring in the corner visualises this interval draining.
 */
const DONE_AUTOCLOSE_MS = 2200;

function truncate(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Wait for the Dynamic SDK to expose the ZeroDev smart-wallet
 * account (or at minimum any EVM account) and return its address.
 *
 * We specifically wait for the kernel account — not the WaaS EOA —
 * because everything downstream (balance read, `sendUserOperation`,
 * Fireblocks push target) needs to agree on a single address, and
 * the kernel is the one that supports sponsored UserOperations. The
 * EOA shows up first and the kernel is registered shortly after, so
 * `walletAccountsChanged` may fire twice; we only resolve once the
 * kernel is actually present.
 */
function waitForEvmWallet(timeoutMs = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const existing = getPrimarySmartEvmAccount();
    if (existing?.address) return resolve(existing.address);

    const listener = () => {
      const account = getPrimarySmartEvmAccount();
      if (account?.address) {
        clearTimeout(timer);
        offEvent({ event: "walletAccountsChanged", listener });
        resolve(account.address);
      }
    };

    const timer = setTimeout(() => {
      offEvent({ event: "walletAccountsChanged", listener });
      reject(new Error("Timed out waiting for wallet"));
    }, timeoutMs);

    onEvent({ event: "walletAccountsChanged", listener });
  });
}

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Dynamic embedded wallet creation.
 *
 * Steps:
 *  1. Confirm — preview the network and asset
 *  2. Creating — real call: createWaasWalletAccounts
 *  3. Done — shows the real wallet address from getWalletAccounts()
 */
export function CreateWalletModal({ isOpen, onClose }: CreateWalletModalProps) {
  const { setWallet } = usePayoutContext();
  const { milestone } = useTrack();
  const { networkLabel } = useActiveNetwork();
  const [step, setStep] = useState<Step>("confirm");
  const [createdAddress, setCreatedAddress] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const hasCreatedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setStep("confirm");
      setCreatedAddress("");
      setErrorMessage("");
      hasCreatedRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function doCreateWallet() {
    if (hasCreatedRef.current) return;
    hasCreatedRef.current = true;

    setStep("creating");
    setErrorMessage("");

    try {
      // Always reach for the ZeroDev kernel account — that's the
      // address payouts should target and the one `sendUserOperation`
      // needs later. `getPrimarySmartEvmAccount()` prefers the
      // kernel; we only provision if it's missing.
      let address: string | null =
        getPrimarySmartEvmAccount()?.address ?? null;

      if (!address) {
        // Visa-direct only ever needs an EVM wallet for USDC payouts —
        // provision explicitly instead of trusting
        // `getChainsMissingWaasWalletAccounts()` which can include SOL
        // if the SDK thinks the env supports it, and then fail with
        // "No wallet provider found with key: dynamicwaassol:*" on
        // envs that only have EVM WaaS enabled.
        const missingChains = await getChainsMissingWaasWalletAccounts();
        if (missingChains.includes("EVM")) {
          await createWaasWalletAccounts({ chains: ["EVM"] });
        }
        address = await waitForEvmWallet();
      }

      setCreatedAddress(address);
      setWallet(address, "embedded");
      milestone("wallet_created");
      setStep("done");
      // Auto-dismiss after a beat so the success card doesn't linger
      // on screen; users can still click Close to dismiss sooner.
      setTimeout(onClose, DONE_AUTOCLOSE_MS);
    } catch (err) {
      hasCreatedRef.current = false;
      setErrorMessage(
        err instanceof Error ? err.message : "Wallet creation failed",
      );
      setStep("error");
    }
  }

  const canClose = step !== "creating";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className="bg-(--brand-surface) rounded-(--brand-radius-lg) shadow-xl w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-wallet-title"
      >
        {/* Header — hidden on the "creating" and "done" steps so the
            hero spinner / success check can own the vertical space.
            Accessible title is rendered sr-only on those steps below. */}
        {step !== "creating" && step !== "done" && (
          <div className="flex items-center justify-between p-6 border-b border-(--brand-border)">
            <h2
              id="create-wallet-title"
              className="text-base font-semibold text-(--brand-fg)"
            >
              Create your wallet
            </h2>
            {canClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-hover) transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-6">
          {/* Step 1 — confirm */}
          {step === "confirm" && (
            <div className="space-y-4">
              <p className="text-sm text-(--brand-muted)">
                We&apos;ll provision a secure wallet linked to your account,
                ready to receive USDC payouts instantly. Nothing to install,
                nothing to remember.
              </p>
              <div className="rounded-(--brand-radius) bg-(--brand-row-bg) border border-(--brand-border) divide-y divide-(--brand-border)">
                <div className="flex justify-between items-center px-3 py-2.5">
                  <span className="text-xs text-(--brand-muted)">Network</span>
                  <span className="text-xs font-medium text-(--brand-fg)">
                    {networkLabel ?? "Detecting…"}
                  </span>
                </div>
                <div className="flex justify-between items-center px-3 py-2.5">
                  <span className="text-xs text-(--brand-muted)">Asset</span>
                  <span className="text-xs font-medium text-(--brand-fg)">
                    USDC
                  </span>
                </div>
                <div className="flex justify-between items-center px-3 py-2.5">
                  <span className="text-xs text-(--brand-muted)">
                    Wallet type
                  </span>
                  <span className="text-xs font-medium text-(--brand-fg)">
                    Embedded
                  </span>
                </div>
              </div>
              <Button className="w-full" onClick={doCreateWallet}>
                Continue
              </Button>
            </div>
          )}

          {/* Step 2 — creating */}
          {step === "creating" && (
            <div className="flex flex-col items-center py-8 gap-4">
              <h2 id="create-wallet-title" className="sr-only">
                Creating your wallet
              </h2>
              <div className="w-10 h-10 border-2 border-(--brand-primary) border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-(--brand-fg)">
                Creating your wallet…
              </p>
            </div>
          )}

          {/* Step 3 — done */}
          {step === "done" && (
            <div className="relative">
              {/* Countdown ring — visual auto-close timer that also
                  acts as a click-to-close affordance. */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute top-0 right-0 p-1 rounded-full text-(--brand-muted) hover:text-(--brand-fg) transition-colors"
              >
                <CountdownRing durationMs={DONE_AUTOCLOSE_MS} />
              </button>

              <div className="flex flex-col items-center py-8 gap-3">
                <h2 id="create-wallet-title" className="sr-only">
                  Wallet created
                </h2>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-(--brand-fg)">
                  Wallet created
                </p>
                {createdAddress && (
                  <p className="text-sm font-mono text-(--brand-muted)">
                    {truncate(createdAddress)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error state */}
          {step === "error" && (
            <div className="space-y-4">
              <div className="p-3 rounded-(--brand-radius) bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-800 mb-1">
                  Wallet creation failed
                </p>
                <p className="text-xs text-red-700">{errorMessage}</p>
              </div>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Small circular countdown indicator — a stroked SVG ring that drains
 * over `durationMs`. Used in the success-step corner to show the
 * auto-close timer visually.
 */
function CountdownRing({ durationMs }: { durationMs: number }) {
  const [drained, setDrained] = useState(false);
  useEffect(() => {
    // Kick to "drained" on the next frame so the CSS transition runs
    // from the initial full-circumference state.
    const t = window.setTimeout(() => setDrained(true), 20);
    return () => window.clearTimeout(t);
  }, []);
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="11"
        cy="11"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="2"
      />
      <circle
        cx="11"
        cy="11"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={drained ? c : 0}
        transform="rotate(-90 11 11)"
        style={{ transition: `stroke-dashoffset ${durationMs}ms linear` }}
      />
    </svg>
  );
}
