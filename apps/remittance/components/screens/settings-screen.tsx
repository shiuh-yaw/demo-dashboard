"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  AlertTriangle,
  User,
  Shield,
  Wallet,
  Copy,
  Check,
  Building2,
  Users,
  Trash2,
  CreditCard,
  RotateCcw,
  PiggyBank,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Spinner,
} from "@dynamic-demos/ui";
import { usePrimaryWallet } from "@/hooks/use-primary-wallet";
import { exportWaasPrivateKey, isWaasWalletAccount } from "@/lib/dynamic";
import { getBaseWalletForAddress } from "@/lib/wallet-utils";
import { useWalletAccounts } from "@/hooks/use-wallet-accounts";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { useClearRecipients } from "@/hooks/use-recipients";
import { getAuthToken } from "@/lib/dynamic";
import type { RecipientEntry } from "@/lib/recipients";
import { ErrorMessage } from "@/components/ui/error-message";

interface SettingsScreenProps {
  walletAddress: string;
  /** From server - no client fetch. */
  kycApproved: boolean;
  /** From server - no client fetch. */
  bankingOnboardingComplete: boolean;
  /** From server - no client fetch. */
  initialRecipients?: RecipientEntry[];
  /** Whether user has a stub stablecoin debit card. */
  hasStubCard?: boolean;
  /** Current card balance (total deposits). */
  cardBalance?: number;
  /** Current save balance (total save deposits). */
  saveBalance?: number;
}

export function SettingsScreen({
  walletAddress,
  kycApproved,
  bankingOnboardingComplete,
  initialRecipients = [],
  hasStubCard = false,
  cardBalance = 0,
  saveBalance = 0,
}: SettingsScreenProps) {
  const router = useRouter();
  const { primaryWallet, isLoading } = usePrimaryWallet();
  const { walletAccounts } = useWalletAccounts();
  const [recipients, setRecipients] =
    useState<RecipientEntry[]>(initialRecipients);
  const clearRecipients = useClearRecipients();
  const baseWallet = getBaseWalletForAddress(walletAddress, walletAccounts);
  const displayContainerRef = useRef<HTMLDivElement>(null);
  const { copied, copy } = useCopyFeedback();

  const [isExporting, setIsExporting] = useState(false);
  const [hasExportedKey, setHasExportedKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exportRequestedRef = useRef(false);
  const [isResettingCard, setIsResettingCard] = useState(false);
  const [cardResetError, setCardResetError] = useState<string | null>(null);
  const [isResettingBalance, setIsResettingBalance] = useState(false);
  const [balanceResetError, setBalanceResetError] = useState<string | null>(
    null,
  );
  const [isResettingSave, setIsResettingSave] = useState(false);
  const [saveResetError, setSaveResetError] = useState<string | null>(null);
  const [isClearingKyc, setIsClearingKyc] = useState(false);
  const [clearKycError, setClearKycError] = useState<string | null>(null);

  const canExport =
    baseWallet &&
    isWaasWalletAccount({ walletAccount: baseWallet }) &&
    !isLoading;

  const handleExportPrivateKey = () => {
    if (!baseWallet || !canExport) return;
    setError(null);
    exportRequestedRef.current = true;
    setIsExporting(true);
  };

  // Run export after div is rendered (ref is set)
  useEffect(() => {
    if (
      !isExporting ||
      !exportRequestedRef.current ||
      !baseWallet ||
      !displayContainerRef.current
    ) {
      return;
    }

    let cancelled = false;

    async function runExport() {
      try {
        await exportWaasPrivateKey({
          walletAccount: baseWallet!,
          displayContainer: displayContainerRef.current!,
        });
        if (!cancelled) setHasExportedKey(true);
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to export private key. It may be disabled in your environment.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          exportRequestedRef.current = false;
          setIsExporting(false);
        }
      }
    }

    void runExport();
    return () => {
      cancelled = true;
    };
  }, [isExporting, baseWallet]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--widget-fg)">Settings</h1>
        <p className="text-sm text-(--widget-muted) mt-1">
          Manage your wallet and account preferences
        </p>
      </div>

      {/* Account section — full address and KYC */}
      <Card>
        <CardHeader
          className="px-5 pt-5 pb-2"
          title={
            <span className="flex items-center gap-2">
              <User className="w-4 h-4 text-(--widget-muted)" />
              Account
            </span>
          }
        />
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-(--widget-muted) mb-1.5">
              Wallet address
            </p>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-(--widget-row-bg) border border-(--widget-border)">
              <p className="flex-1 text-sm font-mono text-(--widget-fg) break-all">
                {walletAddress || "—"}
              </p>
              {walletAddress && (
                <button
                  onClick={() => copy(walletAddress)}
                  className="shrink-0 p-2 rounded-md hover:bg-(--widget-row-hover) text-(--widget-muted) hover:text-(--widget-fg) transition-colors"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-(--widget-success)" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <div>
              <p className="text-xs font-medium text-(--widget-muted) mb-1.5">
                KYC status
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    kycApproved
                      ? "bg-(--widget-success)/10 text-(--widget-success)"
                      : "bg-(--widget-muted)/10 text-(--widget-muted)"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  {kycApproved ? "Verified" : "Not verified"}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-(--widget-muted) mb-1.5">
                Banking onboarding
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    bankingOnboardingComplete
                      ? "bg-(--widget-success)/10 text-(--widget-success)"
                      : "bg-(--widget-muted)/10 text-(--widget-muted)"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {bankingOnboardingComplete ? "Complete" : "Not complete"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet section — export private key */}
      <Card>
        <CardHeader
          className="px-5 pt-5 pb-2"
          title={
            <span className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-(--widget-muted)" />
              Export Private Key
            </span>
          }
        />
        <CardContent className="space-y-4">
          <p className="text-sm text-(--widget-muted)">
            Securely export your embedded wallet private key
          </p>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-(--widget-row-bg) border border-(--widget-border)">
            <AlertTriangle className="w-5 h-5 text-(--widget-warning) shrink-0 mt-0.5" />
            <div className="text-sm text-(--widget-muted)">
              <p className="font-medium text-(--widget-fg) mb-1">
                Keep your private key secure
              </p>
              <p>
                Never share your private key with anyone. Anyone with your
                private key has full control of your wallet and funds.
              </p>
            </div>
          </div>

          {error && (
            <ErrorMessage
              error={error}
              defaultMessage="Failed to export private key. It may be disabled in your environment."
            />
          )}

          {!primaryWallet ? (
            <p className="text-sm text-(--widget-muted)">
              You need an embedded wallet to export a private key. Create or
              connect a wallet first.
            </p>
          ) : !canExport ? (
            <p className="text-sm text-(--widget-muted)">
              Private key export is only available for embedded (WaaS) wallets.
              Your connected wallet is not an embedded wallet.
            </p>
          ) : (
            <div className="space-y-3">
              <Button
                variant="outline"
                size="default"
                onClick={handleExportPrivateKey}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Spinner size="sm" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                <span>{isExporting ? "Exporting…" : "Export Private Key"}</span>
              </Button>
              {(isExporting || hasExportedKey) && (
                <div
                  ref={displayContainerRef}
                  className="h-20 p-4 rounded-lg border border-(--widget-border) bg-(--widget-row-bg) overflow-auto"
                  aria-label="Private key display container"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data & cards — clear recipients, reset card */}
      <Card>
        <CardHeader
          className="px-5 pt-5 pb-2"
          title={
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-(--widget-muted)" />
              Contacts & Card
            </span>
          }
        />
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-(--widget-muted)">
              Contacts you&apos;ve added for sending USDC. Clearing removes all
              saved contacts; you can add them again when sending.
            </p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-(--widget-fg)">
                {recipients.length} contact
                {recipients.length !== 1 ? "s" : ""} saved
              </span>
              <Button
                variant="outline"
                size="default"
                onClick={() =>
                  clearRecipients.mutate(undefined, {
                    onSuccess: () => setRecipients([]),
                  })
                }
                disabled={recipients.length === 0 || clearRecipients.isPending}
              >
                {clearRecipients.isPending ? (
                  <Spinner size="sm" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>
                  {clearRecipients.isPending ? "Clearing…" : "Clear all"}
                </span>
              </Button>
            </div>
            <ErrorMessage error={clearRecipients.error} />
          </div>

          <div className="border-t border-(--widget-border) pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-(--widget-muted)" />
              <span className="text-sm font-medium text-(--widget-fg)">
                Stablecoin Card
              </span>
            </div>
            <p className="text-sm text-(--widget-muted)">
              Reset your stablecoin debit card metadata. This removes the card
              from your account; you can create a new one from the dashboard.
            </p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-(--widget-fg)">
                {hasStubCard ? "Card linked" : "No card"}
              </span>
              <Button
                variant="outline"
                size="default"
                onClick={async () => {
                  setIsResettingCard(true);
                  setCardResetError(null);
                  try {
                    const token = await getAuthToken();
                    if (!token) throw new Error("Not authenticated");
                    const res = await fetch("/api/cards/reset", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(err.error ?? "Failed to reset card");
                    }
                    router.refresh();
                  } catch (err) {
                    setCardResetError(
                      err instanceof Error
                        ? err.message
                        : "Failed to reset card",
                    );
                  } finally {
                    setIsResettingCard(false);
                  }
                }}
                disabled={!hasStubCard || isResettingCard}
              >
                {isResettingCard ? (
                  <Spinner size="sm" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>
                  {isResettingCard ? "Resetting…" : "Reset card metadata"}
                </span>
              </Button>
            </div>
            {cardResetError && (
              <ErrorMessage
                error={cardResetError}
                defaultMessage="Failed to reset card"
              />
            )}
          </div>

          <div className="border-t border-(--widget-border) pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-(--widget-muted)" />
              <span className="text-sm font-medium text-(--widget-fg)">
                Card Balance
              </span>
            </div>
            <p className="text-sm text-(--widget-muted)">
              Reset your card balance (total deposits) back to $0.
            </p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-(--widget-fg)">
                Balance: ${cardBalance.toFixed(2)}
              </span>
              <Button
                variant="outline"
                size="default"
                onClick={async () => {
                  setIsResettingBalance(true);
                  setBalanceResetError(null);
                  try {
                    const token = await getAuthToken();
                    if (!token) throw new Error("Not authenticated");
                    const res = await fetch("/api/deposits/reset", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(err.error ?? "Failed to reset balance");
                    }
                    router.refresh();
                  } catch (err) {
                    setBalanceResetError(
                      err instanceof Error
                        ? err.message
                        : "Failed to reset balance",
                    );
                  } finally {
                    setIsResettingBalance(false);
                  }
                }}
                disabled={cardBalance === 0 || isResettingBalance}
              >
                {isResettingBalance ? (
                  <Spinner size="sm" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>{isResettingBalance ? "Resetting…" : "Reset to $0"}</span>
              </Button>
            </div>
            {balanceResetError && (
              <ErrorMessage
                error={balanceResetError}
                defaultMessage="Failed to reset balance"
              />
            )}
          </div>

          <div className="border-t border-(--widget-border) pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-(--widget-muted)" />
              <span className="text-sm font-medium text-(--widget-fg)">
                Save Balance
              </span>
            </div>
            <p className="text-sm text-(--widget-muted)">
              Reset your save balance (total save deposits) back to $0.
            </p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-(--widget-fg)">
                Balance: ${saveBalance.toFixed(2)}
              </span>
              <Button
                variant="outline"
                size="default"
                onClick={async () => {
                  setIsResettingSave(true);
                  setSaveResetError(null);
                  try {
                    const token = await getAuthToken();
                    if (!token) throw new Error("Not authenticated");
                    const res = await fetch("/api/saves/reset", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(
                        err.error ?? "Failed to reset save balance",
                      );
                    }
                    router.refresh();
                  } catch (err) {
                    setSaveResetError(
                      err instanceof Error
                        ? err.message
                        : "Failed to reset save balance",
                    );
                  } finally {
                    setIsResettingSave(false);
                  }
                }}
                disabled={saveBalance === 0 || isResettingSave}
              >
                {isResettingSave ? (
                  <Spinner size="sm" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>{isResettingSave ? "Resetting…" : "Reset to $0"}</span>
              </Button>
            </div>
            {saveResetError && (
              <ErrorMessage
                error={saveResetError}
                defaultMessage="Failed to reset save balance"
              />
            )}
          </div>

          <div className="border-t border-(--widget-border) pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-(--widget-muted)" />
              <span className="text-sm font-medium text-(--widget-fg)">
                KYC Verification
              </span>
            </div>
            <p className="text-sm text-(--widget-muted)">
              Reset your KYC verification status. This will require you to
              complete identity verification again.
            </p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-(--widget-fg)">
                {kycApproved ? "Verified" : "Not verified"}
              </span>
              <Button
                variant="outline"
                size="default"
                onClick={async () => {
                  setIsClearingKyc(true);
                  setClearKycError(null);
                  try {
                    const token = await getAuthToken();
                    if (!token) throw new Error("Not authenticated");
                    const res = await fetch("/api/kyc/clear", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(
                        err.error ?? "Failed to clear KYC",
                      );
                    }
                    router.refresh();
                  } catch (err) {
                    setClearKycError(
                      err instanceof Error
                        ? err.message
                        : "Failed to clear KYC",
                    );
                  } finally {
                    setIsClearingKyc(false);
                  }
                }}
                disabled={!kycApproved || isClearingKyc}
              >
                {isClearingKyc ? (
                  <Spinner size="sm" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>{isClearingKyc ? "Clearing…" : "Reset KYC"}</span>
              </Button>
            </div>
            {clearKycError && (
              <ErrorMessage
                error={clearKycError}
                defaultMessage="Failed to clear KYC"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
