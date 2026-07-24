"use client";

/**
 * KYC Deposit demo slot. Renders a "Verified deposit" landing card
 * with a "Get started" CTA; clicking the CTA mounts the SAME
 * `<ExchangeCheckoutWidget />` used by checkout and deposit — with an
 * additional KYC verification gate between wallet connect and asset
 * selection via the `postConnectScreen` prop.
 *
 * After KYC passes, the widget's deposit address is set to the user's own
 * connected wallet (a self-send), so repeat demos don't drain test USDC. The
 * merchant-bank offramp is simulated server-side and the end user never sees
 * Iron branding.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/back-button";
import { ExchangeCheckoutWidget } from "@/components/exchange-checkout-widget";
import { ScenarioCard } from "@/components/scenario-card";
import { USDC_BASE_SEPOLIA, chainFamilyForId } from "@/lib/tokens";
import { createFlow, settlementFromToken, destination } from "@/lib/checkouts-api";
import type { TokenAsset } from "@dynamic-demos/checkouts-widget";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { logout } from "@/lib/dynamic/flow-sdk";
import { getDynamicClient } from "@/lib/dynamic/client";
import { fetchJson } from "@/lib/fetch-json";
import { KycIllustration } from "./kyc-illustration";

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const client = getDynamicClient();
  if (client) {
    const token = (client as unknown as { token?: string | null }).token;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// USDC on Base Sepolia. The picker is locked to this exact token, so the
// widget sees source === destination (same chain + address) and performs a
// DIRECT on-chain transfer to the user's own wallet (self-send) — no Flow API /
// cross-chain conversion (which doesn't support Base Sepolia settlement anyway).
const SETTLEMENT_TOKEN = USDC_BASE_SEPOLIA;
const SETTLEMENT_CHAIN = chainFamilyForId(SETTLEMENT_TOKEN.chainId);

export function KycDepositWidgetDemo({
  destinationOverride,
}: {
  destinationOverride?: string | null;
}) {
  const [started, setStarted] = useState(false);
  // Incremented on demo-reset; appended to the SumSub externalUserId so each
  // reset creates a fresh applicant and the full verification flow re-runs.
  const [resetNonce, setResetNonce] = useState(0);
  const [resetting, setResetting] = useState(false);

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      // Clear the persisted KYC flag (best-effort — needs a connected user).
      await fetchJson("/api/kyc-deposit/reset", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      // Then drop the Dynamic session so the verified wallet leaves the SDK
      // singleton — otherwise re-selecting the same provider re-runs
      // connectAndVerify on an already-verified account ("this wallet is
      // already verified").
      await logout();
    } finally {
      setResetNonce((n) => n + 1);
      setStarted(false);
      setResetting(false);
    }
  }, []);

  // Back = leave the flow AND unlink the wallet. Without the logout, the
  // verified wallet stays in the shared SDK singleton, so re-entering and
  // re-clicking the same provider throws "this wallet is already verified".
  const handleBack = useCallback(async () => {
    await logout();
    setStarted(false);
  }, []);

  return (
    <div className="w-full max-w-[440px] mx-auto lg:mx-0">
      {started ? (
        <WidgetStage
          onBack={handleBack}
          resetNonce={resetNonce}
          destinationOverride={destinationOverride}
        />
      ) : (
        <ScenarioCard
          eyebrow="Verified deposit"
          title="Pay in USDC, settle in dollars"
          body="Connect your wallet and verify your identity once, then pay in USDC. The payment is off-ramped to the merchant's bank account as USD automatically."
          ctaLabel="Get started"
          onCta={() => setStarted(true)}
          illustration={<KycIllustration />}
        />
      )}

      {/* Demo control — re-run the KYC flow from scratch. */}
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          className="text-[11px] font-medium text-(--brand-muted) underline decoration-dotted underline-offset-2 hover:text-(--brand-fg) disabled:opacity-50"
        >
          {resetting ? "Resetting…" : "Reset KYC (demo)"}
        </button>
      </div>
    </div>
  );
}

function WidgetStage({
  onBack,
  resetNonce,
  destinationOverride,
}: {
  onBack: () => void;
  resetNonce: number;
  destinationOverride?: string | null;
}) {
  const [walletAddress, setWalletAddress] = useState("");
  const [depositAddress, setDepositAddress] = useState("");
  // Captured from the widget's amount picker so we can trigger the merchant
  // offramp once the on-chain transfer settles.
  const depositAmount = useRef("");

  const handleWalletConnected = useCallback(
    (address: string, _chain: string) => {
      setWalletAddress(address);
    },
    [],
  );

  const createFlowCallback = useCallback(
    ({ amount, currency }: { amount: string; currency: string }) => {
      if (!depositAddress) {
        return Promise.reject(
          new Error("Complete KYC verification before depositing"),
        );
      }
      return createFlow({
        mode: "deposit",
        amount,
        currency,
        settlementConfig: {
          settlements: [settlementFromToken(SETTLEMENT_TOKEN, SETTLEMENT_CHAIN)],
        },
        destinationConfig: {
          destinations: [
            destination(SETTLEMENT_CHAIN, destinationOverride ?? depositAddress),
          ],
        },
      });
    },
    [depositAddress, destinationOverride],
  );

  // Lock the picker to exactly USDC on Base Sepolia so source === destination
  // → the widget does a direct transfer to the user's own wallet (no Flow).
  const tokenFilter = useCallback(
    (token: TokenAsset) =>
      token.chainId === SETTLEMENT_TOKEN.chainId &&
      token.symbol.toUpperCase() === SETTLEMENT_TOKEN.symbol.toUpperCase(),
    [],
  );

  const handleDisconnect = useCallback(() => {
    setWalletAddress("");
    setDepositAddress("");
    logout();
  }, []);

  // Dynamic's balances API doesn't cover Base Sepolia, so the default
  // asset-picker fetch (`getBalances`) comes back empty for funded wallets.
  // For this demo only, read the USDC balance via our server-side Alchemy
  // route and hand the picker a ready-made TokenAsset.
  const fetchTokens = useCallback(
    async (wallet: WalletAccount): Promise<TokenAsset[]> => {
      if ((wallet.chain as string) !== "EVM") return [];
      const res = await fetchJson<{ balance?: number; rawBalance?: string }>(
        `/api/kyc-deposit/balances?address=${wallet.address}`,
        { headers: getAuthHeaders() },
      );
      if (!res.ok) throw new Error(res.error || "Failed to load balances");
      const balance = res.data?.balance ?? 0;
      if (balance <= 0) return [];
      return [
        {
          id: `${SETTLEMENT_TOKEN.symbol}-${SETTLEMENT_TOKEN.chainId}-${SETTLEMENT_TOKEN.address}`,
          name: SETTLEMENT_TOKEN.name,
          symbol: SETTLEMENT_TOKEN.symbol,
          balance: String(balance),
          rawBalance: BigInt(res.data?.rawBalance ?? "0x0").toString(),
          decimals: SETTLEMENT_TOKEN.decimals,
          // Testnet USDC has no price feed; it's USD-pegged, so the
          // balance is its dollar value (mirrors the package's Sepolia
          // stablecoin display rule).
          usdValue: `$${balance.toFixed(2)}`,
          pricePerToken: 1,
          iconUrl: SETTLEMENT_TOKEN.logoURI,
          chainId: SETTLEMENT_TOKEN.chainId,
          tokenAddress: SETTLEMENT_TOKEN.address,
        },
      ];
    },
    [],
  );

  const handlePostConnect = useCallback(
    (wallet: WalletAccount, proceed: () => void) => (
      <KycGate
        wallet={wallet}
        resetNonce={resetNonce}
        onPassed={(addr) => {
          setDepositAddress(addr);
          // Guarantee the depositor address is the connected wallet (the
          // onWalletConnected callback can lag the direct-transfer path), so
          // the deposit feed shows the real "From" instead of the rail.
          setWalletAddress(wallet.address);
          proceed();
        }}
      />
    ),
    [resetNonce],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {/* Wrap so BackButton's own `self-start` doesn't top-align it against
            the taller pill — the wrapper centers within the row. */}
        <span className="inline-flex items-center">
          <BackButton onClick={onBack} label="Back" />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium leading-none text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Testnet · Base Sepolia
        </span>
      </div>
      <ExchangeCheckoutWidget
        hidePoweredBy
        hideLegalLinks
        hideDestination
        alwaysShowRoute
        onDisconnect={handleDisconnect}
        createFlow={createFlowCallback}
        destinationToken={SETTLEMENT_TOKEN}
        tokenFilter={tokenFilter}
        fetchTokens={fetchTokens}
        skipMinUsdValueFilter
        onWalletConnected={handleWalletConnected}
        destinationAddress={
          destinationOverride ?? (depositAddress || walletAddress)
        }
        destinationChain={SETTLEMENT_CHAIN}
        currency="USD"
        presetAmounts={[5, 25, 50, 100]}
        minAmount={2}
        amountFirst
        mode="deposit"
        verifyOnConnect
        onCancelled={onBack}
        onAmountSelected={(amount) => {
          depositAmount.current = amount;
        }}
        onSettlementCompleted={() => {
          // On-chain self-send settled — trigger the merchant's Iron offramp
          // (money → bank) and let the feed reflect it. Surface
          // failures (don't swallow) so a missing deposit row is debuggable.
          const amountUsdc = depositAmount.current;
          void (async () => {
            if (!amountUsdc) {
              console.error(
                "[kyc-deposit] settle skipped — no deposit amount captured",
              );
              return;
            }
            const res = await fetchJson("/api/kyc-deposit/settle", {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify({
                amountUsdc,
                fromAddress: walletAddress || undefined,
              }),
            });
            if (!res.ok) {
              console.error("[kyc-deposit] settle failed:", res.error);
            }
          })();
        }}
        exchangeDestinationAddress={
          destinationOverride ?? (depositAddress || walletAddress || undefined)
        }
        exchangeSettlementChain={SETTLEMENT_CHAIN}
        exchangeSettlementChainId={SETTLEMENT_TOKEN.chainId}
        postConnectScreen={handlePostConnect}
      />
    </div>
  );
}

// =============================================================================
// KYC Gate — renders inside the CheckoutWidget's WidgetCard after connect
// =============================================================================

function KycGate({
  wallet,
  resetNonce,
  onPassed,
}: {
  wallet: WalletAccount;
  resetNonce: number;
  onPassed: (depositAddress: string) => void;
}) {
  // Our Dynamic metadata is the source of truth for "verified". Whenever this
  // gate renders, metadata says NOT verified — so always run a FRESH SumSub
  // applicant (unique per mount). Reusing a prior, already-approved applicant
  // makes SumSub fire a GREEN status on load, which would (a) falsely mark
  // completion when the user refreshes mid-flow, and (b) make "Reset KYC"
  // appear to do nothing (the green applicant instantly re-completes).
  // resetNonce is folded in so an explicit reset is always distinct too.
  const [externalUserId] = useState(
    () => `${wallet.address}-${resetNonce}-${Date.now().toString(36)}`,
  );
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Only render the modal once we know SumSub is actually required. Returning,
  // already-verified users skip straight to provisioning with no modal flash.
  const [needsSumsub, setNeedsSumsub] = useState(false);
  // Set on a GREEN review — swaps SumSub's terminal screen for our own
  // confirmation while the deposit address provisions.
  const [verified, setVerified] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkInitialized = useRef(false);
  const passed = useRef(false);

  // Provision the Iron deposit address and advance to the deposit step.
  // Idempotent: only proceeds once (resettable on failure so it can retry).
  const provisionAndProceed = useCallback(async () => {
    if (passed.current) return;
    passed.current = true;
    const res = await fetchJson<{ depositAddress?: string }>(
      "/api/kyc-deposit/deposit-address",
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: `${wallet.address.slice(0, 8)}@demo.local`,
          walletAddress: wallet.address,
        }),
      },
    );
    if (!res.ok || !res.data?.depositAddress) {
      passed.current = false;
      setError(res.error || "Failed to get deposit address");
      return;
    }
    onPassed(res.data.depositAddress);
  }, [wallet.address, onPassed]);

  // Step 1 — if KYC was already completed (persisted in Dynamic user
  // metadata), skip SumSub entirely and go straight to provisioning.
  // Otherwise create the SumSub applicant + access token.
  useEffect(() => {
    void (async () => {
      const status = await fetchJson<{ completed?: boolean }>(
        "/api/kyc-deposit/kyc-status",
        { headers: getAuthHeaders() },
      );
      if (status.ok && status.data?.completed) {
        await provisionAndProceed();
        return;
      }
      // Not verified yet — now we show the SumSub modal.
      setNeedsSumsub(true);
      const res = await fetchJson<{ accessToken?: string }>(
        "/api/kyc-deposit/init",
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            externalUserId,
            email: `${wallet.address.slice(0, 8)}@demo.local`,
          }),
        },
      );
      if (!res.ok || !res.data?.accessToken) {
        setError(res.error || "Failed to initialize KYC");
        setLoading(false);
        return;
      }
      setAccessToken(res.data.accessToken);
      setLoading(false);
    })();
  }, [wallet.address, externalUserId, provisionAndProceed]);

  // Launch SumSub WebSDK
  useEffect(() => {
    if (!accessToken || !containerRef.current || sdkInitialized.current) return;
    sdkInitialized.current = true;

    const script = document.createElement("script");
    script.src =
      "https://static.sumsub.com/idensic/static/sns-websdk-builder.js";
    script.onload = () => {
      interface SnsWebSdkBuilder {
        init: (
          accessToken: string,
          onTokenExpired: () => Promise<string>,
        ) => SnsWebSdkChain;
      }
      interface SnsWebSdkChain {
        withConf: (conf: Record<string, unknown>) => SnsWebSdkChain;
        withOptions: (opts: Record<string, unknown>) => SnsWebSdkChain;
        on: (event: string, cb: (...args: unknown[]) => void) => SnsWebSdkChain;
        build: () => { launch: (container: HTMLElement) => void };
      }

      // The builder script exposes the global `snsWebSdk` (the `…Instance`
      // name in SumSub's docs is just a local var for the built SDK).
      const snsWebSdk = (window as unknown as Record<string, unknown>)
        .snsWebSdk as SnsWebSdkBuilder | undefined;

      if (!snsWebSdk) {
        setError("SumSub verification SDK failed to load");
        return;
      }
      if (!containerRef.current) return;

      const onTokenExpired = async (): Promise<string> => {
        const res = await fetchJson<{ accessToken?: string }>(
          "/api/kyc-deposit/init",
          {
            method: "POST",
            headers: getAuthHeaders(),
            // Same applicant as the initial init — refreshing the token must
            // not spawn a different applicant.
            body: JSON.stringify({ externalUserId }),
          },
        );
        return res.data?.accessToken || "";
      };

      const sdk = snsWebSdk
        .init(accessToken, onTokenExpired)
        // `theme: "light"` matches the surrounding light-themed app (the SDK
        // otherwise follows the device theme, often dark). Deeper brand colors
        // / logo (and the empty header) are configured in SumSub Cockpit ->
        // Customizations — the SDK renders in a cross-origin iframe and WebSDK
        // 2.0 ignores `uiConf.customCssStr`, so we cannot restyle it from here.
        .withConf({ lang: "en", theme: "light" })
        .withOptions({ addViewportTag: false, adaptIframeHeight: true })
        // WebSDK 2.0 namespaces all events under `idCheck.` — the bare
        // "applicantStatusChanged" never fires. This also fires on load for an
        // already-verified applicant, so re-entry auto-advances too.
        .on("idCheck.onApplicantStatusChanged", (payload: unknown) => {
          const p = payload as {
            reviewStatus?: string;
            reviewResult?: { reviewAnswer?: string };
          };
          if (
            p.reviewStatus === "completed" &&
            p.reviewResult?.reviewAnswer === "GREEN"
          ) {
            // Immediately swap SumSub's "You may close this page" terminal
            // screen for our own branded confirmation while we provision.
            setVerified(true);
            void (async () => {
              // Persist KYC completion to Dynamic metadata (best-effort), then
              // provision the deposit address and advance.
              await fetchJson("/api/kyc-deposit/complete", {
                method: "POST",
                headers: getAuthHeaders(),
              });
              await provisionAndProceed();
            })();
          }
        })
        .on("idCheck.onError", (err: unknown) => {
          setError(
            err instanceof Error ? err.message : "KYC verification error",
          );
        });

      sdk.build().launch(containerRef.current);
    };

    script.onerror = () => {
      setError("Could not load the SumSub verification SDK");
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [accessToken, wallet.address, externalUserId, provisionAndProceed]);

  // Renders inline inside the widget card (via postConnectScreen). The widget's
  // own chrome (Back button) handles cancel — no competing modal header/close.
  // Returning, already-verified users skip SumSub and provision directly, so we
  // show a light inline loader (no flash) until that resolves.
  // Verified — our own confirmation while the deposit address provisions,
  // replacing SumSub's "Your profile has been verified / You may close this
  // page" terminal screen so the hand-off into the deposit step feels seamless.
  if (verified) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M7 12.5l3.5 3.5 7-7"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-(--brand-fg)">
            Identity verified
          </p>
          <p className="text-xs text-(--brand-muted)">Preparing your deposit…</p>
        </div>
        <span
          className="mt-1 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--brand-border,#e7e8ed)] border-t-[var(--brand-fg,#0e121b)]"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!needsSumsub && !error) {
    return (
      <div className="flex items-center justify-center py-16">
        <span
          className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--brand-border,#e7e8ed)] border-t-[var(--brand-fg,#0e121b)]"
          aria-label="Loading"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {loading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-xs text-[var(--brand-muted,#99a0ae)] animate-pulse">
            Preparing verification…
          </p>
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* SumSub renders its own branded, titled screen here (themed in the
          SumSub dashboard). adaptIframeHeight keeps the card sized to content.
          Do NOT wrap this in an overflow/transform/negative-margin container —
          it breaks SumSub's height measurement and collapses the iframe. */}
      <div ref={containerRef} className="min-h-[320px]" />
    </div>
  );
}
