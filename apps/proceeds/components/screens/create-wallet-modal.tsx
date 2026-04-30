"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Fingerprint } from "lucide-react";
import { Button, Spinner } from "@dynamic-demos/ui";
import {
  getWalletAccounts,
  isEvmWalletAccount,
  createWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts,
  onEvent,
  offEvent,
  updateWalletMeta,
  registerPasskey,
  hasRegisteredPasskeys,
  switchActiveNetwork,
  getEvmWalletAccount,
} from "@/lib/dynamic";

const POLYGON_MAINNET_ID = "137";

type Step =
  | "confirm"
  | "biometric_prompt"
  | "biometric_registering"
  | "creating"
  | "done"
  | "error";

function truncate(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletCreated: (address: string) => void;
}

/**
 * Wait for the SDK to expose an EVM wallet account.
 * Uses the `walletAccountsChanged` event rather than polling.
 */
function waitForEvmWallet(timeoutMs = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const check = () => {
      const accounts = getWalletAccounts();
      const evm = accounts.find((w) => isEvmWalletAccount(w));
      return evm?.address;
    };

    const existing = check();
    if (existing) return resolve(existing);

    const listener = () => {
      const address = check();
      if (address) {
        clearTimeout(timer);
        offEvent({ event: "walletAccountsChanged", listener });
        resolve(address);
      }
    };

    const timer = setTimeout(() => {
      offEvent({ event: "walletAccountsChanged", listener });
      reject(new Error("Timed out waiting for wallet"));
    }, timeoutMs);

    onEvent({ event: "walletAccountsChanged", listener });
  });
}

export function CreateWalletModal({
  isOpen,
  onClose,
  onWalletCreated,
}: CreateWalletModalProps) {
  const [step, setStep] = useState<Step>("confirm");
  const [createdAddress, setCreatedAddress] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [biometricError, setBiometricError] = useState("");
  const hasCreatedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setStep("confirm");
      setCreatedAddress("");
      setErrorMessage("");
      setBiometricError("");
      hasCreatedRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleContinue() {
    setBiometricError("");
    // Jump straight to wallet creation if the user already has biometrics registered.
    const alreadyHasPasskey = await hasRegisteredPasskeys();
    if (alreadyHasPasskey) {
      await doCreateWallet();
    } else {
      setStep("biometric_prompt");
    }
  }

  async function handleRegisterPasskey() {
    setBiometricError("");
    setStep("biometric_registering");
    try {
      await registerPasskey();
      await doCreateWallet();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (
        lower.includes("cancel") ||
        lower.includes("abort") ||
        lower.includes("not allowed")
      ) {
        setBiometricError(
          "Biometric registration was cancelled. Complete the prompt to secure your wallet.",
        );
      } else if (lower.includes("authorization") || lower.includes("401")) {
        setBiometricError(
          "Biometric MFA isn't enabled for this environment. Enable passkey MFA in the Dynamic dashboard (Security → MFA).",
        );
      } else {
        setBiometricError(`Couldn't register biometrics: ${msg.slice(0, 180)}`);
      }
      setStep("biometric_prompt");
    }
  }

  async function doCreateWallet() {
    if (hasCreatedRef.current) return;
    hasCreatedRef.current = true;

    setStep("creating");
    setErrorMessage("");

    try {
      // If a wallet already exists (soft-deleted), just un-delete it.
      const existing = getWalletAccounts().find((w) => isEvmWalletAccount(w));
      let address: string;

      if (existing?.address) {
        address = existing.address;
      } else {
        const missingChains = await getChainsMissingWaasWalletAccounts();
        if (missingChains.length > 0) {
          await createWaasWalletAccounts({ chains: missingChains });
        }
        address = await waitForEvmWallet();
      }

      await updateWalletMeta(address, { deleted: false });

      // Switch to Polygon mainnet after wallet is ready
      try {
        const walletAccount = getEvmWalletAccount();
        if (walletAccount) {
          await switchActiveNetwork({
            networkId: POLYGON_MAINNET_ID,
            walletAccount,
          });
        }
      } catch {
        // Non-fatal — wallet still created, user can switch network manually
      }

      setCreatedAddress(address);
      onWalletCreated(address);
      setStep("done");
      setTimeout(onClose, 1500);
    } catch (err) {
      hasCreatedRef.current = false;
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong creating your wallet.",
      );
      setStep("error");
    }
  }

  const canClose = step !== "creating" && step !== "biometric_registering";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => {
        if (canClose && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-(--widget-bg) rounded-(--widget-radius-lg) shadow-xl w-full max-w-md"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="text-base font-semibold text-(--widget-fg)">
            {step === "biometric_prompt" || step === "biometric_registering"
              ? "Secure your wallet"
              : "Create your wallet"}
          </h2>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-(--widget-primary) hover:underline"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="px-6 pb-6 pt-4">
          {step === "confirm" && (
            <div className="space-y-4">
              <p className="text-sm text-(--widget-muted) leading-relaxed">
                A Dynamic Embedded Wallet will be created for you. The key is
                split via TSS-MPC between this device and Dynamic — no single
                party ever holds the full key.
              </p>
              {/* <div className="rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border) divide-y divide-(--widget-border)">
                {[
                  ["Network", "Polygon"],
                  ["Asset", "USDC"],
                  ["Wallet", "Dynamic Embedded Wallet"],
                  ["Key custody", "TSS-MPC"],
                  ["Transfer auth", "WebAuthn passkey (Touch ID)"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between items-center px-3 py-2.5"
                  >
                    <span className="text-xs text-(--widget-muted)">
                      {label}
                    </span>
                    <span className="text-xs font-medium text-(--widget-fg)">
                      {value}
                    </span>
                  </div>
                ))}
              </div> */}

              <Button className="w-full" onClick={handleContinue}>
                Continue
              </Button>
            </div>
          )}

          {step === "biometric_prompt" && (
            <div className="flex flex-col items-center gap-5 py-2">
              <div className="w-16 h-16 rounded-full bg-(--widget-row-bg) border-2 border-(--widget-border) flex items-center justify-center">
                <Fingerprint className="w-8 h-8 text-(--widget-primary)" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-(--widget-fg)">
                  Protect with biometrics
                </p>
                <p className="text-xs text-(--widget-muted) mt-1 max-w-[320px]">
                  Face ID or Touch ID is required to secure your wallet and
                  confirm every outbound transfer.
                </p>
              </div>
              {biometricError && (
                <p className="text-xs text-center text-(--widget-error) max-w-[320px]">
                  {biometricError}
                </p>
              )}
              <Button className="w-full" onClick={handleRegisterPasskey}>
                Enable Face ID / Touch ID
              </Button>
            </div>
          )}

          {step === "biometric_registering" && (
            <div className="flex flex-col items-center py-10 gap-4">
              <Fingerprint className="w-10 h-10 text-(--widget-muted)" />
              <p className="text-sm text-(--widget-fg)">
                Complete the biometric prompt…
              </p>
            </div>
          )}

          {step === "creating" && (
            <div className="flex flex-col items-center py-10 gap-4">
              <Spinner size="lg" />
              <p className="text-sm text-(--widget-fg)">
                Creating your wallet…
              </p>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-(--widget-fg)">
                Wallet ready
              </p>
              {createdAddress && (
                <p className="text-sm font-mono text-(--widget-muted)">
                  {truncate(createdAddress)}
                </p>
              )}
            </div>
          )}

          {step === "error" && (
            <div className="space-y-4">
              <div className="p-3 rounded-(--widget-radius) bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-800 mb-1">
                  Wallet creation failed
                </p>
                <p className="text-xs text-red-700">{errorMessage}</p>
              </div>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
