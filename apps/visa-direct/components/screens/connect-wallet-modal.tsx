"use client";

/**
 * Connect your Exchange Wallet — driven by Dynamic's configured exchanges.
 *
 * Phase 2. Lists every exchange Dynamic has configured for this env
 * (via `getAvailableExchanges()`), displays them using entries from
 * the local `exchanges-registry`, and runs the user through:
 *
 *   1. select       — pick an exchange (skipped when only one exists)
 *   2. intro        — per-exchange explainer + "Continue with {name}"
 *   3. redirecting  — browser navigating to the exchange (very brief)
 *   4. connected    — back from OAuth; show identity + (Kraken) balance
 *                     strip, auto-fetch deposit address via Dynamic,
 *                     or fall back to paste when unsupported / errors
 *   5. enter-address — manual paste path (fallback)
 *   6. verify       — name match between host profile and exchange acct
 *   7. done         — address saved to PayoutContext
 *
 * On OAuth redirect we leave the app, so the modal's state is lost.
 * The `useCefi` hook in the parent screen signals `didJustConnect`
 * (with the persisted exchange key) so this modal reopens at the
 * right step.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Check,
  Copy,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Link2,
} from "lucide-react";
import { SocialIcon } from "@dynamic-labs/iconic";
import { Button, Input } from "@dynamic-demos/ui";
import { cn } from "@dynamic-demos/utils";
import {
  type KrakenAccount,
  type KrakenDepositAddress,
  type SocialAccount,
  type AvailableExchange,
} from "@/lib/dynamic";
import { usePayoutContext } from "@/contexts/payout-context";
import {
  getExchangeDisplay,
  type ExchangeDisplay,
} from "@/lib/exchanges-registry";
import type {
  FetchDepositAddressInput,
  DepositAddressError,
} from "@/hooks/use-cefi";

type Step =
  | "select"
  | "intro"
  | "redirecting"
  | "connected"
  | "enter-address"
  | "verify"
  | "done";

/**
 * How long the success card lingers before the modal auto-closes.
 * The countdown ring in the corner visualises this interval draining.
 */
const DONE_AUTOCLOSE_MS = 2200;

function isValidEvmAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function truncate(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function sumUsdcBalance(accounts: KrakenAccount[]): number {
  return accounts.reduce((sum, acc) => {
    const usdc = acc.balances?.find((b) => b.currency === "USDC");
    if (!usdc) return sum;
    return sum + (usdc.availableBalance ?? usdc.balance ?? 0);
  }, 0);
}

function describeDepositError(err: DepositAddressError): string {
  if (err.code === "not-connected") {
    return "Exchange account isn't linked yet. Reconnect to continue.";
  }
  return "We couldn't retrieve your deposit address automatically. Paste it below to continue.";
}

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Step to start at when reopening after OAuth return. */
  initialStep?: Step;
  /** Exchanges Dynamic has configured for this env. */
  availableExchanges: AvailableExchange[];
  /** The currently-active exchange key (from useCefi). */
  activeExchange: string | null;
  isConnected: boolean;
  socialAccount: SocialAccount | null;
  krakenAccounts: KrakenAccount[];
  isLoadingAccounts: boolean;
  refetchAccounts: () => void;
  connect: (exchangeKey: string) => Promise<void>;
  fetchDepositAddress: (
    input?: FetchDepositAddressInput,
  ) => Promise<KrakenDepositAddress | null>;
  isFetchingDepositAddress: boolean;
  depositAddressError: DepositAddressError | null;
  clearDepositAddressError: () => void;
  /**
   * Set when Dynamic rejected the OAuth link because the exchange
   * account is already attached to a DIFFERENT user on this app.
   */
  linkConflict: { exchange: string; message: string } | null;
  clearLinkConflict: () => void;
}

export function ConnectWalletModal({
  isOpen,
  onClose,
  initialStep,
  availableExchanges,
  activeExchange,
  isConnected,
  socialAccount,
  krakenAccounts,
  isLoadingAccounts,
  refetchAccounts,
  connect,
  fetchDepositAddress,
  isFetchingDepositAddress,
  depositAddressError,
  clearDepositAddressError,
  linkConflict,
  clearLinkConflict,
}: ConnectWalletModalProps) {
  const { setWallet } = usePayoutContext();
  const [step, setStep] = useState<Step>("select");
  const [selectedExchangeKey, setSelectedExchangeKey] = useState<string | null>(
    null,
  );
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [copied, setCopied] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [depositInfo, setDepositInfo] = useState<KrakenDepositAddress | null>(
    null,
  );
  const autoFetchedRef = useRef(false);

  // Pick an initial exchange and step whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setAddress("");
    setAddressError("");
    setCopied(false);
    setConnectError("");
    setDepositInfo(null);
    clearDepositAddressError();
    autoFetchedRef.current = false;

    // If we're opening because of a link conflict, pin the modal on
    // the intro step for the conflicted exchange so the banner is
    // scoped and the user can try again with a different account.
    if (linkConflict) {
      setSelectedExchangeKey(linkConflict.exchange);
      setStep("intro");
      return;
    }

    // Seed selected exchange: prefer the user's active (just-connected
    // or previously-linked) one, otherwise the only available one when
    // there's a single choice.
    const seed =
      activeExchange ??
      (availableExchanges.length === 1
        ? availableExchanges[0]?.exchange
        : null) ??
      null;
    setSelectedExchangeKey(seed);

    if (initialStep) {
      setStep(initialStep);
    } else if (isConnected && seed) {
      setStep("connected");
    } else if (seed) {
      setStep("intro");
    } else {
      setStep("select");
    }
  }, [
    isOpen,
    initialStep,
    isConnected,
    activeExchange,
    availableExchanges,
    linkConflict,
    clearDepositAddressError,
  ]);

  // Auto-fetch the deposit address once we land on the "connected" step.
  // Ref-guarded so it fires exactly once per modal open — on failure,
  // the user still sees a "Paste address manually" fallback button.
  useEffect(() => {
    if (!isOpen) return;
    if (step !== "connected") return;
    if (autoFetchedRef.current) return;
    if (!isConnected) return;
    autoFetchedRef.current = true;

    void fetchDepositAddress({ asset: "USDC", network: "Ethereum" }).then(
      (result) => {
        if (result) {
          setDepositInfo(result);
          setAddress(result.address);
        }
      },
    );
  }, [isOpen, step, isConnected, fetchDepositAddress]);

  // Hoisted above the `isOpen` early-return so hook call order stays
  // consistent across renders (react rules-of-hooks).
  const selectedDisplay = useMemo(
    () =>
      selectedExchangeKey ? getExchangeDisplay(selectedExchangeKey) : null,
    [selectedExchangeKey],
  );

  // Pull the OAuth provider name (e.g. "coinbasesocial", "kraken") from
  // Dynamic's available-exchanges list so we can fall back to Dynamic's
  // built-in `SocialIcon` when the registry has no custom logo.
  const selectedSocialProvider = useMemo(
    () =>
      availableExchanges.find((e) => e.exchange === selectedExchangeKey)
        ?.socialProvider ?? null,
    [availableExchanges, selectedExchangeKey],
  );

  if (!isOpen) return null;

  const selectedName = selectedDisplay?.name ?? "Exchange";
  const selectedKey = selectedDisplay?.key ?? "";

  const krakenDisplayName =
    socialAccount?.displayName ||
    socialAccount?.username ||
    socialAccount?.emails?.[0] ||
    `${selectedName} account`;

  const totalUsdc = sumUsdcBalance(krakenAccounts);
  const showBalanceStrip = selectedKey === "kraken";

  async function handleConnect() {
    if (!selectedExchangeKey) return;
    setConnectError("");
    setStep("redirecting");
    try {
      await connect(selectedExchangeKey);
      // Page navigating away — unreachable after this.
    } catch (err) {
      setConnectError(
        err instanceof Error ? err.message : "Could not open exchange",
      );
      setStep("intro");
    }
  }

  function handlePickExchange(key: string) {
    setSelectedExchangeKey(key);
    setStep("intro");
  }

  function handleVerifyAddress() {
    const trimmed = address.trim();
    if (!isValidEvmAddress(trimmed)) {
      setAddressError("Enter a valid Ethereum address (0x…, 42 characters)");
      return;
    }
    setAddressError("");
    setStep("verify");
  }

  function handleConfirm() {
    if (!selectedExchangeKey) return;
    setWallet(address.trim(), selectedExchangeKey);
    setStep("done");
    // Auto-dismiss after the countdown ring drains.
    setTimeout(onClose, DONE_AUTOCLOSE_MS);
  }

  function handleCopy() {
    navigator.clipboard.writeText(address.trim()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const showBack =
    step === "enter-address" ||
    step === "verify" ||
    (step === "intro" && availableExchanges.length > 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className="bg-(--widget-bg) rounded-(--widget-radius-lg) shadow-xl w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-wallet-title"
      >
        {/* Header — hidden on done (hero check owns the screen, with
            its own Close button) and redirecting (no interaction
            expected). Accessible title is rendered sr-only on those
            steps below. */}
        {step !== "done" && step !== "redirecting" && (
          <div className="flex items-center justify-between p-6 border-b border-(--widget-border)">
            <div className="flex items-center gap-2">
              {showBack && (
                <button
                  onClick={() => {
                    if (step === "verify") setStep("enter-address");
                    else if (step === "enter-address") setStep("connected");
                    else if (step === "intro") setStep("select");
                  }}
                  className="p-1 text-(--widget-muted) hover:text-(--widget-fg) transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <h2
                id="connect-wallet-title"
                className="text-base font-semibold text-(--widget-fg)"
              >
                Connect your Exchange Wallet
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-(--widget-muted) hover:text-(--widget-fg) hover:bg-(--widget-row-hover) transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-6">
          {step === "select" && (
            <SelectStep
              availableExchanges={availableExchanges}
              onPick={handlePickExchange}
            />
          )}

          {step === "intro" && selectedDisplay && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <ExchangeLogo
                  display={selectedDisplay}
                  socialProvider={selectedSocialProvider}
                  size="md"
                />
                <div>
                  <p className="text-sm font-medium text-(--widget-fg)">
                    {selectedName}
                  </p>
                  <p className="text-xs text-(--widget-muted)">
                    {selectedDisplay.tagline}
                  </p>
                </div>
              </div>

              <div className="rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border) divide-y divide-(--widget-border)">
                <NumberedStep
                  n={1}
                  label={`Sign in to ${selectedName} to verify you own the account`}
                />
                <NumberedStep
                  n={2}
                  label={
                    selectedDisplay.supportsAutoDepositFetch
                      ? `Confirm your ${selectedName} USDC deposit address`
                      : `Paste your ${selectedName} USDC deposit address`
                  }
                />
                <NumberedStep
                  n={3}
                  label="Visa Direct pushes USDC straight to your wallet"
                />
              </div>

              {connectError && (
                <p className="text-xs text-(--widget-error)">{connectError}</p>
              )}

              {linkConflict && linkConflict.exchange === selectedKey && (
                <div className="p-3 rounded-(--widget-radius) bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-amber-800">
                        Already linked elsewhere
                      </p>
                      <p className="text-[11px] text-amber-700 mt-0.5 break-words">
                        {linkConflict.message}
                      </p>
                    </div>
                    <button
                      onClick={clearLinkConflict}
                      className="p-0.5 text-amber-700 hover:text-amber-900 transition-colors flex-shrink-0"
                      aria-label="Dismiss"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              <Button className="w-full gap-1.5" onClick={handleConnect}>
                Continue with {selectedName}
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
              <p className="text-[11px] text-(--widget-muted) text-center">
                You&apos;ll be redirected to authorize on the exchange.
              </p>
            </div>
          )}

          {step === "redirecting" && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-10 h-10 border-2 border-(--widget-primary) border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-(--widget-fg)">
                Redirecting to {selectedName}…
              </p>
            </div>
          )}

          {step === "connected" && selectedDisplay && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border)">
                <ExchangeLogo
                  display={selectedDisplay}
                  socialProvider={selectedSocialProvider}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-(--widget-fg) truncate">
                      {krakenDisplayName}
                    </p>
                    <Check className="w-3.5 h-3.5 text-(--widget-success) flex-shrink-0" />
                  </div>
                  <p className="text-xs text-(--widget-muted)">
                    {selectedName} account linked
                  </p>
                </div>
                {showBalanceStrip && (
                  <button
                    onClick={refetchAccounts}
                    disabled={isLoadingAccounts}
                    className="p-1 text-(--widget-muted) hover:text-(--widget-fg) transition-colors disabled:opacity-50"
                    aria-label="Refresh balances"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        isLoadingAccounts ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                )}
              </div>

              {showBalanceStrip && (
                <div className="rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border) divide-y divide-(--widget-border)">
                  <div className="flex justify-between items-center px-3 py-2.5">
                    <span className="text-xs text-(--widget-muted)">
                      Accounts
                    </span>
                    <span className="text-xs font-medium text-(--widget-fg)">
                      {isLoadingAccounts ? "Loading…" : krakenAccounts.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2.5">
                    <span className="text-xs text-(--widget-muted)">
                      USDC balance
                    </span>
                    <span className="text-xs font-medium text-(--widget-fg) tabular-nums">
                      {isLoadingAccounts
                        ? "Loading…"
                        : `${totalUsdc.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} USDC`}
                    </span>
                  </div>
                </div>
              )}

              {isFetchingDepositAddress && !depositInfo && (
                <div className="flex items-center gap-3 p-3 rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border)">
                  <div className="w-4 h-4 border-2 border-(--widget-primary) border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <p className="text-xs text-(--widget-muted)">
                    Fetching your USDC deposit address from {selectedName}…
                  </p>
                </div>
              )}

              {depositInfo && (
                <div className="p-3 rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border)">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-(--widget-muted)">
                      USDC deposit address
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-medium">
                      From {selectedName}
                    </span>
                  </div>
                  <p className="text-sm font-mono text-(--widget-fg) break-all">
                    {depositInfo.address}
                  </p>
                  <p className="text-xs text-(--widget-muted) mt-1">
                    {depositInfo.method} · {depositInfo.asset}
                  </p>
                </div>
              )}

              {depositAddressError && !depositInfo && (
                <div className="p-3 rounded-(--widget-radius) bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-amber-800">
                        Couldn&apos;t fetch address automatically
                      </p>
                      <p className="text-[11px] text-amber-700 mt-0.5 break-words">
                        {describeDepositError(depositAddressError)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {depositInfo ? (
                <Button className="w-full" onClick={() => setStep("verify")}>
                  Next — confirm address
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setStep("enter-address")}
                  disabled={isFetchingDepositAddress}
                >
                  Paste address manually
                </Button>
              )}
            </div>
          )}

          {step === "enter-address" && selectedDisplay && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-2.5 rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border)">
                <ExchangeLogo
                  display={selectedDisplay}
                  socialProvider={selectedSocialProvider}
                  size="xs"
                />
                <p className="text-xs text-(--widget-muted)">
                  In {selectedName}: Funding → Deposit → USDC → Ethereum network
                  → copy the deposit address.
                </p>
              </div>
              <Input
                label={`${selectedName} USDC deposit address`}
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (addressError) setAddressError("");
                }}
                placeholder="0x..."
              />
              {addressError && (
                <p className="text-xs text-(--widget-error)">{addressError}</p>
              )}
              <Button className="w-full" onClick={handleVerifyAddress}>
                Verify address
              </Button>
            </div>
          )}

          {step === "verify" && selectedDisplay && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border)">
                <ExchangeLogo
                  display={selectedDisplay}
                  socialProvider={selectedSocialProvider}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-(--widget-fg) truncate">
                    {krakenDisplayName}
                  </p>
                  <p className="text-xs text-(--widget-muted)">
                    {selectedName} account linked
                  </p>
                </div>
                <Check className="w-4 h-4 text-(--widget-success) flex-shrink-0" />
              </div>

              <div className="p-3 rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border)">
                <p className="text-xs font-medium text-(--widget-muted) mb-1">
                  Wallet address
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-mono text-(--widget-fg) break-all">
                    {truncate(address.trim())}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="ml-2 p-1 text-(--widget-muted) hover:text-(--widget-fg) transition-colors flex-shrink-0"
                    aria-label="Copy address"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-(--widget-success)" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-(--widget-muted) mt-0.5">
                  via {selectedName} · Ethereum · USDC
                </p>
              </div>

              <Button className="w-full" onClick={handleConfirm}>
                Confirm connection
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="relative">
              {/* Countdown ring in the top-right — also acts as a
                  click-to-close affordance. */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute top-0 right-0 p-1 rounded-full text-(--widget-muted) hover:text-(--widget-fg) transition-colors"
              >
                <CountdownRing durationMs={DONE_AUTOCLOSE_MS} />
              </button>

              <div className="flex flex-col items-center py-8 gap-3">
                <h2 id="connect-wallet-title" className="sr-only">
                  {selectedName} wallet connected
                </h2>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-(--widget-fg)">
                  {selectedName} wallet connected
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// Sub-components
// =========================================================================

function SelectStep({
  availableExchanges,
  onPick,
}: {
  availableExchanges: AvailableExchange[];
  onPick: (key: string) => void;
}) {
  if (availableExchanges.length === 0) {
    return (
      <div className="p-3 rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border)">
        <p className="text-sm text-(--widget-fg) font-medium mb-1">
          No exchanges configured
        </p>
        <p className="text-xs text-(--widget-muted)">
          Enable an exchange (Kraken, Coinbase…) in the Dynamic dashboard under
          Log-in Methods and Funding for this environment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-(--widget-muted)">
        Choose an exchange to link your USDC deposit address.
      </p>
      {availableExchanges.map((ex) => {
        const d = getExchangeDisplay(ex.exchange);
        return (
          <button
            key={ex.exchange}
            onClick={() => onPick(ex.exchange)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
              "border-(--widget-border) bg-(--widget-row-bg) hover:bg-(--widget-row-hover)",
            )}
          >
            <ExchangeLogo
              display={d}
              socialProvider={ex.socialProvider}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-(--widget-fg)">{d.name}</p>
              <p className="text-xs text-(--widget-muted) truncate">
                {d.tagline}
              </p>
            </div>
            <Link2 className="w-4 h-4 text-(--widget-muted) flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

function NumberedStep({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <span className="mt-0.5 w-5 h-5 rounded-full bg-(--widget-primary)/10 text-(--widget-primary) text-[11px] font-semibold flex items-center justify-center flex-shrink-0">
        {n}
      </span>
      <p className="text-xs text-(--widget-muted)">{label}</p>
    </div>
  );
}

/**
 * Small circular countdown indicator — a stroked SVG ring that drains
 * over `durationMs`. Used in the success-step corner to show the
 * auto-close timer visually. Click handling (to close immediately) is
 * owned by the parent button.
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
      {/* Faint track */}
      <circle
        cx="11"
        cy="11"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="2"
      />
      {/* Draining arc — starts full, transitions offset to the full
          circumference so it visually disappears counter-clockwise. */}
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

function MonogramAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "xs" | "sm" | "md";
}) {
  const initial = name.charAt(0).toUpperCase();
  const dim =
    size === "xs"
      ? "w-6 h-6 text-[10px] rounded-[6px]"
      : size === "sm"
        ? "w-8 h-8 text-xs rounded-[8px]"
        : "w-10 h-10 text-sm rounded-[10px]";
  return (
    <div
      className={cn(
        "flex items-center justify-center flex-shrink-0 font-semibold bg-(--widget-primary)/10 text-(--widget-primary) border border-(--widget-border)",
        dim,
      )}
    >
      {initial}
    </div>
  );
}

/**
 * Renders an exchange logo using, in priority order:
 *   1. The custom `Logo` component from `exchanges-registry` (e.g. our
 *      branded `KrakenLogo` tile).
 *   2. Dynamic's built-in `SocialIcon` keyed by `socialProvider` (e.g.
 *      `"coinbasesocial"`, `"kraken"`) — covers any exchange Dynamic
 *      supports without us having to author a bespoke asset.
 *   3. A text-monogram avatar as a last resort.
 *
 * Sizes match the sites where the logo renders: `xs` (24px) in
 * the enter-address hint row, `sm` (32px) in the select list and verify
 * summary, `md` (40px) in the intro/connected headers.
 */
function ExchangeLogo({
  display,
  socialProvider,
  size,
}: {
  display: ExchangeDisplay;
  socialProvider: string | null;
  size: "xs" | "sm" | "md";
}) {
  const sizeClass =
    size === "xs"
      ? "w-6 h-6 rounded-[6px]"
      : size === "sm"
        ? "w-8 h-8 rounded-[8px]"
        : "w-10 h-10 rounded-[10px]";

  if (display.Logo) {
    const Logo = display.Logo;
    return <Logo className={cn(sizeClass, "flex-shrink-0")} />;
  }

  if (socialProvider) {
    // SocialIcon renders an SVG — size it via the shared sizeClass and
    // give it a subtle rounded tile so it sits next to KrakenLogo visually.
    return (
      <div
        className={cn(
          sizeClass,
          "flex-shrink-0 flex items-center justify-center bg-(--widget-row-bg) border border-(--widget-border) p-1",
        )}
      >
        <SocialIcon name={socialProvider} className="w-full h-full" />
      </div>
    );
  }

  return <MonogramAvatar name={display.name} size={size} />;
}
