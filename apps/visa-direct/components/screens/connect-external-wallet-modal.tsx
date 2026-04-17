"use client";

/**
 * Connect your external wallet — driven by Dynamic's available wallet
 * providers (MetaMask, Coinbase Wallet, Rabby, WalletConnect, …).
 *
 * Flow:
 *   1. select      — pick a wallet provider (filtered to EVM)
 *   2. connecting  — awaiting approval + signature in the user's wallet
 *   3. verify      — show the linked address and ask the user to confirm
 *   4. done        — address saved to PayoutContext, modal auto-closes
 *
 * We filter `getAvailableWalletProviders()` down to chain="EVM" and
 * dedupe by `groupKey` so the list reads like "MetaMask" / "Coinbase
 * Wallet" rather than the SDK's per-chain provider keys ("metamaskevm",
 * "coinbasewalletevm", …).
 *
 * After `connectAndVerifyWithWalletProvider` resolves, the linked
 * external wallet shows up in `getWalletAccounts()` — we listen for
 * `walletAccountsChanged` (with an immediate check first) and read the
 * address via `getExternalEvmWalletAccount()`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  Check,
  Copy,
  ArrowLeft,
  AlertTriangle,
  Wallet,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@dynamic-demos/ui";
import { cn } from "@dynamic-demos/utils";
import {
  connectAndVerifyWithWalletProvider,
  getAvailableWalletProviders,
  getExternalEvmWalletAccount,
  offEvent,
  onEvent,
  waitForClientInitialized,
  type WalletProviderData,
} from "@/lib/dynamic";
import { usePayoutContext } from "@/contexts/payout-context";

type Step = "select" | "connecting" | "verify" | "screening" | "done";

interface ConnectExternalWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Persist `provider` values in PayoutContext as `external:{key}`. */
export const EXTERNAL_WALLET_PROVIDER_PREFIX = "external:";

const DONE_AUTOCLOSE_MS = 2200;

/**
 * Compliance-style screening shown between `Confirm connection` and
 * the final `done` success card. Mirrors the payout modal's
 * Fireblocks animation so hosts see a consistent "we did our checks"
 * surface whenever an off-dashboard wallet enters the system.
 *
 * Each entry's `delayMs` is the *cumulative* time (from step entry)
 * at which that row flips to complete. Tweak to lengthen / shorten
 * the sequence without renumbering anything else.
 */
const SCREENING_STEPS = [
  { id: "ownership", label: "Ownership verification", delayMs: 700 },
  { id: "wallet", label: "Wallet verification", delayMs: 1500 },
  { id: "sanctions", label: "Sanctions screening", delayMs: 2300 },
] as const;

const SCREENING_TOTAL_MS =
  SCREENING_STEPS[SCREENING_STEPS.length - 1]!.delayMs + 300;

/**
 * Shape we actually render. Built from Dynamic's per-chain provider
 * list, deduped by `groupKey` so a single wallet (e.g. MetaMask, which
 * registers `metamaskevm` + `metamasksol`) shows up once.
 */
interface WalletGroup {
  /** The specific per-chain provider key passed to `connectAndVerify…`. */
  key: string;
  /** Wallet brand name ("MetaMask"). */
  displayName: string;
  iconUrl?: string;
}

function truncate(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Dig a user-facing error message out of whatever Dynamic's wallet
 * connector throws. The SDK is inconsistent — some providers throw
 * plain `Error` instances, others throw `{ code, message }` objects
 * (EIP-1193 style), and a few throw nested structures like
 * `{ error: { message } }` or `{ cause: Error }`. Naïve
 * `String(err)` / `err.message` lands in "[object Object]" territory
 * for several of those shapes.
 *
 * Returns `null` when the failure is a user-initiated cancellation —
 * the caller uses that to drop the user back to the select step
 * without an alarming banner. Non-cancellation errors come back as
 * a short, friendly string.
 */
function normalizeConnectError(
  err: unknown,
  providerName: string,
): string | null {
  const message = extractMessage(err);
  const code = extractCode(err);

  // EIP-1193 user-rejected-request and common string variants.
  const isCancellation =
    code === 4001 ||
    code === "ACTION_REJECTED" ||
    /user\s*(rejected|denied|cancell?ed)|\brejected.*request|\bcancell?ed/i.test(
      message,
    );
  if (isCancellation) return null;

  if (!message) return `Couldn't connect to ${providerName}. Try again.`;
  // Trim excessively long SDK strings so the banner stays readable.
  return message.length > 200 ? `${message.slice(0, 197)}…` : message;
}

function extractMessage(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err !== "object") return String(err);
  const e = err as Record<string, unknown>;
  // Walk the most common nested shapes Dynamic / viem / wagmi throw.
  const candidates: unknown[] = [
    e.message,
    e.shortMessage,
    e.reason,
    (e.error as { message?: unknown } | undefined)?.message,
    (e.data as { message?: unknown } | undefined)?.message,
    (e.cause as { message?: unknown } | undefined)?.message,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return "";
}

function extractCode(err: unknown): number | string | undefined {
  if (err == null || typeof err !== "object") return undefined;
  const e = err as Record<string, unknown>;
  const candidates: unknown[] = [
    e.code,
    (e.error as { code?: unknown } | undefined)?.code,
    (e.cause as { code?: unknown } | undefined)?.code,
  ];
  for (const c of candidates) {
    if (typeof c === "number" || typeof c === "string") return c;
  }
  return undefined;
}

function buildWalletGroups(providers: WalletProviderData[]): WalletGroup[] {
  return Object.values(
    providers
      .filter((p) => p.chain === "EVM")
      .reduce(
        (acc, provider) => {
          // The SDK uses `groupKey` to tie chain-specific providers
          // back to a single brand (e.g. metamaskevm + metamasksol →
          // "metamask"). Fall back to stripping the chain suffix when
          // it's not set.
          const groupKey =
            provider.groupKey ?? provider.key.replace(/(evm|sol)$/, "");
          if (acc[groupKey]) return acc;
          acc[groupKey] = {
            key: provider.key,
            displayName: provider.metadata?.displayName ?? groupKey,
            iconUrl: provider.metadata?.icon,
          };
          return acc;
        },
        {} as Record<string, WalletGroup>,
      ),
  );
}

/**
 * Wait for an external (non-embedded) EVM wallet to show up in
 * `getWalletAccounts()`. The freshly-linked account is surfaced via
 * `walletAccountsChanged` — we also check synchronously first because
 * the SDK sometimes updates state before the effect runs.
 */
function waitForExternalWallet(timeoutMs = 20000): Promise<string> {
  return new Promise((resolve, reject) => {
    const existing = getExternalEvmWalletAccount();
    if (existing?.address) return resolve(existing.address);

    const listener = () => {
      const account = getExternalEvmWalletAccount();
      if (account?.address) {
        clearTimeout(timer);
        offEvent({ event: "walletAccountsChanged", listener });
        resolve(account.address);
      }
    };
    const timer = setTimeout(() => {
      offEvent({ event: "walletAccountsChanged", listener });
      reject(
        new Error(
          "Connection succeeded but the wallet address didn't surface in time. Try again.",
        ),
      );
    }, timeoutMs);
    onEvent({ event: "walletAccountsChanged", listener });
  });
}

export function ConnectExternalWalletModal({
  isOpen,
  onClose,
}: ConnectExternalWalletModalProps) {
  const { setWallet } = usePayoutContext();
  const [step, setStep] = useState<Step>("select");
  const [providers, setProviders] = useState<WalletGroup[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [selected, setSelected] = useState<WalletGroup | null>(null);
  const [connectedAddress, setConnectedAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [screeningCompleted, setScreeningCompleted] = useState<string[]>([]);
  // Set when the modal is closed mid-screening so queued `setTimeout`
  // callbacks don't flip state on an unmounted component.
  const screeningCancelledRef = useRef(false);

  // Load providers once the SDK is initialised. Re-runs each time the
  // modal opens so a user who adds an injected wallet (e.g. just
  // installed MetaMask) after the page loaded sees the updated list
  // on the next open.
  useEffect(() => {
    if (!isOpen) {
      // Kill any in-flight screening timers so a user who closes
      // mid-animation doesn't get a state update after unmount.
      screeningCancelledRef.current = true;
      return;
    }
    screeningCancelledRef.current = false;

    setStep("select");
    setSelected(null);
    setConnectedAddress("");
    setCopied(false);
    setErrorMessage("");
    setScreeningCompleted([]);
    setIsLoadingProviders(true);

    let cancelled = false;
    void (async () => {
      try {
        await waitForClientInitialized();
        if (cancelled) return;
        setProviders(buildWalletGroups(getAvailableWalletProviders()));
      } catch {
        if (!cancelled) setProviders([]);
      } finally {
        if (!cancelled) setIsLoadingProviders(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleConnect = useCallback(
    async (group: WalletGroup) => {
      setSelected(group);
      setErrorMessage("");
      setStep("connecting");
      try {
        await connectAndVerifyWithWalletProvider({
          walletProviderKey: group.key,
        });
        const address = await waitForExternalWallet();
        setConnectedAddress(address);
        setStep("verify");
      } catch (err) {
        const friendly = normalizeConnectError(err, group.displayName);
        // A user rejection isn't really an error worth surfacing as a
        // banner — drop them back to the select list silently.
        setErrorMessage(friendly ?? "");
        setStep("select");
      }
    },
    [],
  );

  function handleConfirm() {
    if (!selected || !connectedAddress) return;
    // Kick off the compliance-style screening animation. The actual
    // PayoutContext write is deferred until the animation finishes —
    // see the `step === "screening"` effect below.
    setScreeningCompleted([]);
    setStep("screening");
  }

  // Screening animation: once per `screening` entry, schedule each
  // row's flip-to-done, and on the last one persist the wallet and
  // transition to the success card. Cancellation via the modal's
  // Close button is handled by `screeningCancelledRef`.
  useEffect(() => {
    if (step !== "screening" || !selected || !connectedAddress) return;

    screeningCancelledRef.current = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    SCREENING_STEPS.forEach((s) => {
      timers.push(
        setTimeout(() => {
          if (screeningCancelledRef.current) return;
          setScreeningCompleted((prev) => [...prev, s.id]);
        }, s.delayMs),
      );
    });

    timers.push(
      setTimeout(() => {
        if (screeningCancelledRef.current) return;
        setWallet(
          connectedAddress,
          `${EXTERNAL_WALLET_PROVIDER_PREFIX}${selected.key}`,
        );
        setStep("done");
        // Auto-close is intentionally scheduled by a *separate* effect
        // below (keyed on `step === "done"`) rather than pushed into
        // `timers` here — if we tracked it locally, the `setStep("done")`
        // above would trigger this effect's cleanup and clear the
        // auto-close timer before it ever fires, sticking the modal on
        // the success card forever.
      }, SCREENING_TOTAL_MS),
    );

    return () => {
      screeningCancelledRef.current = true;
      timers.forEach(clearTimeout);
    };
  }, [step, selected, connectedAddress, setWallet]);

  // Auto-close the success card after the countdown ring drains.
  // Owned by its own effect so the screening cleanup above can't
  // accidentally clear the timer when `step` transitions to "done".
  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(onClose, DONE_AUTOCLOSE_MS);
    return () => clearTimeout(t);
  }, [step, onClose]);

  function handleCopy() {
    if (!connectedAddress) return;
    navigator.clipboard.writeText(connectedAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isOpen) return null;

  const showBack = step === "verify";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className="bg-(--widget-bg) rounded-(--widget-radius-lg) shadow-xl w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-external-wallet-title"
      >
        {step !== "connecting" && (
          <div className="flex items-center justify-between p-6 border-b border-(--widget-border)">
            <div className="flex items-center gap-2">
              {showBack && (
                <button
                  onClick={() => {
                    setStep("select");
                    setConnectedAddress("");
                    setSelected(null);
                  }}
                  className="p-1 text-(--widget-muted) hover:text-(--widget-fg) transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              {(step === "screening" || step === "done") && (
                <ShieldCheck
                  className={cn(
                    "w-4 h-4",
                    step === "done"
                      ? "text-(--widget-success)"
                      : "text-(--widget-primary)",
                  )}
                />
              )}
              <h2
                id="connect-external-wallet-title"
                className="text-base font-semibold text-(--widget-fg)"
              >
                {step === "screening"
                  ? "Screening"
                  : step === "done"
                    ? "Connected"
                    : "Connect your external wallet"}
              </h2>
            </div>
            {/* Close is intentionally hidden during screening + the
                post-screening success state — we don't want a host to
                dismiss mid-check and land in an ambiguous state, and
                the success card auto-closes on a short timer anyway. */}
            {step !== "screening" && step !== "done" && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-(--widget-muted) hover:text-(--widget-fg) hover:bg-(--widget-row-hover) transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className="p-6">
          {step === "select" && (
            <SelectStep
              providers={providers}
              isLoading={isLoadingProviders}
              errorMessage={errorMessage}
              onPick={handleConnect}
              onDismissError={() => setErrorMessage("")}
            />
          )}

          {step === "connecting" && selected && (
            <div className="flex flex-col items-center py-8 gap-3">
              <h2
                id="connect-external-wallet-title"
                className="sr-only"
              >
                Connecting to {selected.displayName}
              </h2>
              <div className="w-10 h-10 border-2 border-(--widget-primary) border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-(--widget-fg)">
                Approve in {selected.displayName}…
              </p>
              <p className="text-xs text-(--widget-muted) text-center max-w-[280px]">
                We&apos;ll ask your wallet to sign a one-time message to prove
                you own this address. No funds will move.
              </p>
            </div>
          )}

          {step === "verify" && selected && connectedAddress && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border)">
                <WalletBadge group={selected} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-(--widget-fg) truncate">
                    {selected.displayName}
                  </p>
                  <p className="text-xs text-(--widget-muted)">
                    External wallet linked
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
                    {truncate(connectedAddress)}
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
                  via {selected.displayName} · Ethereum · USDC
                </p>
              </div>

              <Button className="w-full" onClick={handleConfirm}>
                Confirm connection
              </Button>
            </div>
          )}

          {(step === "screening" || step === "done") && (
            <div className="space-y-5 py-2">
              <p className="text-xs text-(--widget-muted) text-center">
                {step === "done" && selected
                  ? `${selected.displayName} connected · all checks passed`
                  : "Running compliance checks on your wallet…"}
              </p>

              <div className="space-y-3">
                {SCREENING_STEPS.map((s, i) => {
                  // On the "done" step every row reads as complete —
                  // the user has seen the animated run already and
                  // this frame exists to convey the finished state.
                  const isDone =
                    step === "done" || screeningCompleted.includes(s.id);
                  const isActive =
                    !isDone &&
                    (i === 0 ||
                      screeningCompleted.includes(SCREENING_STEPS[i - 1]!.id));

                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                        {isDone ? (
                          <div className="w-6 h-6 rounded-full bg-(--widget-success) flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        ) : isActive ? (
                          <Loader2 className="w-5 h-5 text-(--widget-primary) animate-spin" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-(--widget-border)" />
                        )}
                      </div>
                      <span
                        className={`text-sm ${
                          isDone
                            ? "text-(--widget-fg) font-medium"
                            : isActive
                              ? "text-(--widget-fg)"
                              : "text-(--widget-muted)"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// Sub-components
// ==========================================================================

function SelectStep({
  providers,
  isLoading,
  errorMessage,
  onPick,
  onDismissError,
}: {
  providers: WalletGroup[];
  isLoading: boolean;
  errorMessage: string;
  onPick: (group: WalletGroup) => void;
  onDismissError: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <div className="w-8 h-8 border-2 border-(--widget-primary) border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-(--widget-muted)">Detecting wallets…</p>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-(--widget-muted)">
          No compatible wallets detected. Install MetaMask, Coinbase Wallet,
          or another crypto wallet and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-(--widget-muted)">
        Link your wallet to receive USDC payouts directly.
      </p>

      {errorMessage && (
        <div className="p-3 rounded-(--widget-radius) bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-amber-800">
                Couldn&apos;t connect
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5 break-words">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={onDismissError}
              className="p-0.5 text-amber-700 hover:text-amber-900 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {providers.map((group) => (
          <button
            key={group.key}
            onClick={() => onPick(group)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
              "border-(--widget-border) bg-(--widget-row-bg) hover:bg-(--widget-row-hover)",
            )}
          >
            <WalletBadge group={group} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-(--widget-fg) truncate">
                {group.displayName}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders the wallet's logo as served by Dynamic, with a generic
 * wallet glyph fallback if the metadata didn't include an icon URL.
 */
function WalletBadge({
  group,
  size = "sm",
}: {
  group: WalletGroup;
  size?: "xs" | "sm" | "md";
}) {
  const sizeClass =
    size === "xs"
      ? "w-6 h-6 rounded-[6px]"
      : size === "sm"
        ? "w-8 h-8 rounded-[8px]"
        : "w-10 h-10 rounded-[10px]";
  return (
    <div
      className={cn(
        sizeClass,
        "flex items-center justify-center flex-shrink-0 bg-(--widget-bg) border border-(--widget-border) p-1 overflow-hidden",
      )}
    >
      {group.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={group.iconUrl}
          alt={group.displayName}
          className="w-full h-full object-contain"
        />
      ) : (
        <Wallet className="w-4 h-4 text-(--widget-muted)" />
      )}
    </div>
  );
}

