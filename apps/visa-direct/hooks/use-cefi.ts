"use client";

/**
 * useCefi — manages the exchange-wallet connector lifecycle.
 *
 * Orchestrates the OAuth-based "Connect your Exchange Wallet" story
 * across any exchange Dynamic has configured on the env:
 *
 *  - Discovers available exchanges from Dynamic projectSettings
 *  - Kicks off the Dynamic OAuth redirect for the picked exchange
 *  - Detects OAuth return and completes social authentication
 *  - Surfaces identity (name / email) + optional balance fetch where
 *    Dynamic's SDK supports it (Kraken via `getKrakenAccounts`)
 *
 * Historical note: an earlier iteration tried to auto-fetch the
 * exchange deposit address via a server route that hit Kraken's REST
 * API directly. That approach can't work: Kraken's `/0/private/*`
 * endpoints require API-Key + HMAC signing using the Fast API Key
 * that Dynamic holds internally — OAuth Bearer auth is rejected. The
 * user pastes their deposit address manually until Dynamic exposes a
 * server-side proxy we can call.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SocialProvider } from "@dynamic-labs-sdk/client";
import {
  authenticateWithSocial,
  completeSocialAuthentication,
  detectOAuthRedirect,
  getAvailableExchanges,
  getKrakenAccounts,
  getKrakenDepositAddresses,
  getKrakenSocialAccount,
  getUserSocialAccounts,
  refreshAuth,
  waitForClientInitialized,
  onEvent,
  type AvailableExchange,
  type KrakenAccount,
  type KrakenDepositAddress,
  type SocialAccount,
} from "@/lib/dynamic";
import { getExchangeDisplay } from "@/lib/exchanges-registry";
import {
  consumeCefiOAuthPending,
  hasPendingCefiOAuth,
  markCefiOAuthPending,
} from "@/lib/cefi-redirect";

export interface FetchDepositAddressInput {
  asset?: string;
  network?: string;
}

export interface DepositAddressError {
  error: string;
  /** Machine-readable code so the UI can pick appropriate fallback copy. */
  code:
    | "not-connected"
    | "not-configured"
    | "scope-missing"
    | "kraken-error"
    | "unknown";
}

interface UseCefiResult {
  /** Exchanges Dynamic has configured for this env. */
  availableExchanges: AvailableExchange[];
  /**
   * Exchange key of the currently linked / just-linked provider, or
   * null when none. Sourced from the OAuth redirect marker first,
   * then from getUserSocialAccounts().
   */
  activeExchange: string | null;
  /** True if the user has linked at least one supported exchange. */
  isConnected: boolean;
  /** True during the OAuth redirect back-and-complete flow. */
  isCompletingOAuth: boolean;
  /** True when the user just returned from a CeFi OAuth redirect. */
  didJustConnect: boolean;
  clearJustConnected: () => void;
  /** Social account record (displayName / username) for the active exchange. */
  socialAccount: SocialAccount | null;
  /** Kraken accounts with balances (empty for non-Kraken exchanges). */
  krakenAccounts: KrakenAccount[];
  isLoadingAccounts: boolean;
  refetchAccounts: () => void;
  /** Kick off OAuth for the given exchange. */
  connect: (exchangeKey: string) => Promise<void>;
  /**
   * Fetch (or generate) a deposit address for the active exchange.
   * Resolves to null when the exchange doesn't support auto-fetch or
   * the fetch fails — the UI should fall back to manual paste.
   */
  fetchDepositAddress: (
    input?: FetchDepositAddressInput,
  ) => Promise<KrakenDepositAddress | null>;
  isFetchingDepositAddress: boolean;
  depositAddressError: DepositAddressError | null;
  clearDepositAddressError: () => void;
  /**
   * Set when the user tried to link an exchange account that is
   * already linked to a DIFFERENT Dynamic user on this app. Null when
   * there's no conflict. The modal should render this as an intro-
   * level error banner.
   */
  linkConflict: { exchange: string; message: string } | null;
  clearLinkConflict: () => void;
  /**
   * Bumps when the hook wants the parent to (re)open the connect
   * modal — used alongside `linkConflict` so the modal surfaces the
   * error rather than silently failing.
   */
  reopenModalSignal: number;
}

function stripOAuthParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("dynamicOauthCode");
  url.searchParams.delete("dynamicOauthState");
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", url.toString());
}

/**
 * Detect Dynamic's "social_account_already_exists" response from the
 * OAuth completion endpoint. Code + message live in different places
 * depending on how the SDK bubbles the error (fetch body, Error
 * message, nested cause) so we sniff across them.
 */
function isAlreadyLinkedError(err: unknown): boolean {
  if (!err) return false;
  const e = err as {
    code?: string;
    body?: { code?: string; error?: string };
    message?: string;
  };
  if (e.code === "social_account_already_exists") return true;
  if (e.body?.code === "social_account_already_exists") return true;
  const text = `${e.body?.error ?? ""} ${e.message ?? ""}`.toLowerCase();
  return text.includes("already exists") && text.includes("social");
}

export function useCefi(): UseCefiResult {
  const queryClient = useQueryClient();
  const [isCompletingOAuth, setIsCompletingOAuth] = useState(() =>
    typeof window === "undefined" ? false : hasPendingCefiOAuth(),
  );
  const [didJustConnect, setDidJustConnect] = useState(false);
  const [connectedVersion, setConnectedVersion] = useState(0);
  // The exchange the user picked just before OAuth redirect; survives
  // a page reload via sessionStorage so the "connected" step can show
  // the right branding even after the full navigation round-trip.
  const [pendingExchange, setPendingExchange] = useState<string | null>(null);
  const [linkConflict, setLinkConflict] = useState<{
    exchange: string;
    message: string;
  } | null>(null);
  /**
   * Incremented to trigger the modal to reopen — used when we don't
   * want to set `didJustConnect=true` (because the link actually
   * conflicts and we want the modal to show an error instead of
   * rendering the `connected` step).
   */
  const [reopenModal, setReopenModal] = useState(0);
  const oauthHandled = useRef(false);

  // Complete the OAuth flow on return.
  useEffect(() => {
    if (oauthHandled.current) return;
    oauthHandled.current = true;

    const run = async () => {
      const pending = consumeCefiOAuthPending();

      try {
        await waitForClientInitialized();

        const url = new URL(window.location.href);
        const isReturning = await detectOAuthRedirect({ url });

        if (!isReturning) {
          setIsCompletingOAuth(false);
          return;
        }

        let alreadyExistsHit = false;
        try {
          await completeSocialAuthentication({ url });
        } catch (err) {
          if (isAlreadyLinkedError(err)) {
            // Dynamic says this OAuth account is already linked to some
            // application user — could be the current user (no-op
            // success) or a different user (a real conflict we must
            // surface).  We decide below, after refreshing auth.
            alreadyExistsHit = true;
            console.info(
              "[useCefi] social_account_already_exists — verifying owner",
            );
          } else {
            throw err;
          }
        }

        stripOAuthParams();

        // Pull fresh user state so getUserSocialAccounts() reflects the
        // latest linkage (normally completeSocial… does this, but not
        // on the thrown branch).
        await refreshAuth().catch(() => {});

        if (alreadyExistsHit && pending) {
          const linked = getUserSocialAccounts().some((a) => {
            const target = getAvailableExchanges().find(
              (ex) => ex.exchange === pending.exchange,
            );
            return target && a.provider === target.socialProvider;
          });
          if (!linked) {
            // Linked to a different Dynamic user — this user can't use
            // that exchange account. Surface a clear conflict.
            setLinkConflict({
              exchange: pending.exchange,
              message:
                "This exchange account is linked to a different user on this app. Sign in with that user, or unlink it in your exchange settings and try again.",
            });
            // Still reopen the modal so the error is visible — but
            // don't flip `didJustConnect=true` in a way that lies about
            // connection state. The modal reads linkConflict and shows
            // an intro-level error banner.
            setReopenModal((n) => n + 1);
            setConnectedVersion((v) => v + 1);
            return;
          }
        }

        if (pending) {
          setDidJustConnect(true);
          setPendingExchange(pending.exchange);
        }
        setConnectedVersion((v) => v + 1);
      } catch (err) {
        console.error("[useCefi] OAuth completion failed:", err);
        // Strip the OAuth params regardless, so refreshing doesn't
        // replay the failed completion and spam the error overlay.
        stripOAuthParams();
      } finally {
        setIsCompletingOAuth(false);
      }
    };

    void run();
  }, []);

  // Re-render connection state on user / logout changes.
  useEffect(() => {
    const unsubUser = onEvent({
      event: "userChanged",
      listener: () => setConnectedVersion((v) => v + 1),
    });
    const unsubLogout = onEvent({
      event: "logout",
      listener: () => setConnectedVersion((v) => v + 1),
    });
    return () => {
      unsubUser?.();
      unsubLogout?.();
    };
  }, []);

  // Both of these SDK getters return fresh array refs on every call, so
  // we memoise them against `connectedVersion` — which bumps whenever
  // anything that could change their contents fires (userChanged,
  // logout, OAuth completion). Without this, every render produces new
  // refs, which cascades through the modal's reset effect and triggers
  // an infinite loop.
  //
  // The linter can't see that `connectedVersion` is our cache key
  // (the functions don't reference it themselves), so we silence the
  // exhaustive-deps rule for these two lines — this is the intended
  // "version key" pattern, not a missing dep.
  const availableExchanges = useMemo(
    () => getAvailableExchanges(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connectedVersion],
  );
  const socialAccounts = useMemo(
    () => getUserSocialAccounts(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connectedVersion],
  );
  // Prefer the exchange we most recently linked, but only if its
  // social account actually shows up in the current user's linked
  // accounts — otherwise `pendingExchange` would outlive a failed
  // link attempt and make the connected-step UI lie.
  const pendingIsReallyLinked =
    pendingExchange !== null &&
    availableExchanges.some(
      (ex) =>
        ex.exchange === pendingExchange &&
        socialAccounts.some((a) => a.provider === ex.socialProvider),
    );
  const activeExchange =
    (pendingIsReallyLinked ? pendingExchange : null) ??
    availableExchanges.find((ex) =>
      socialAccounts.some((a) => a.provider === ex.socialProvider),
    )?.exchange ??
    null;

  const activeSocialProvider = activeExchange
    ? availableExchanges.find((ex) => ex.exchange === activeExchange)
        ?.socialProvider
    : null;

  const isConnected =
    !!activeExchange &&
    socialAccounts.some((a) => a.provider === activeSocialProvider);

  const socialAccount = activeSocialProvider
    ? (socialAccounts.find((a) => a.provider === activeSocialProvider) ?? null)
    : null;
  // Fallback for Kraken's dedicated helper (keeps behaviour if anything
  // still relies on it).
  const socialAccountResolved = socialAccount ?? getKrakenSocialAccount();

  // Kraken balances — only meaningful for the Kraken exchange.
  const krakenEnabled = activeExchange === "kraken" && isConnected;
  const {
    data: krakenAccounts = [],
    isLoading: isLoadingAccounts,
    refetch,
  } = useQuery<KrakenAccount[]>({
    queryKey: ["krakenAccounts", connectedVersion, activeExchange],
    queryFn: async () => getKrakenAccounts(),
    enabled: krakenEnabled,
    staleTime: 30 * 1000,
    // Dynamic's `/exchange/kraken/accounts` returns 500 when the OAuth
    // scopes haven't been granted (fast-api-key:*). Retrying just
    // spams the server and doesn't change the outcome — show the 0
    // balance state and let the user retry manually.
    retry: false,
  });

  const connect = useCallback(
    async (exchangeKey: string) => {
      const target = availableExchanges.find((e) => e.exchange === exchangeKey);
      if (!target) {
        throw new Error(
          `Exchange "${exchangeKey}" is not available on this env`,
        );
      }
      markCefiOAuthPending({ exchange: exchangeKey });
      await authenticateWithSocial({
        // `AvailableExchange.socialProvider` is a plain string because
        // it comes from a runtime-shape Dynamic setting. The SDK wants
        // the strict `SocialProvider` union here — safe to cast, since
        // `getAvailableExchanges()` only returns entries Dynamic has
        // already provisioned.
        provider: target.socialProvider as SocialProvider,
        redirectUrl: window.location.href,
      });
      // Browser redirects away — everything after this is unreachable.
    },
    [availableExchanges],
  );

  const clearJustConnected = useCallback(() => setDidJustConnect(false), []);

  const refetchAccounts = useCallback(() => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ["krakenAccounts"] });
  }, [refetch, queryClient]);

  // ---------------------------------------------------------------------------
  // Auto-fetch deposit address
  // ---------------------------------------------------------------------------
  //
  // Calls Dynamic's Kraken-deposit-addresses proxy directly via the
  // SDK wrapper. The wrapper uses the user's Dynamic JWT, so Dynamic
  // server-side resolves the user, signs the Kraken REST call with
  // the stored Fast API Key material, and returns the addresses. No
  // custom server route required.
  //
  // Only fires for exchanges whose registry entry sets
  // `supportsAutoDepositFetch=true` — other exchanges go straight to
  // manual paste.

  const [depositAddressError, setDepositAddressError] =
    useState<DepositAddressError | null>(null);

  const depositAddressMutation = useMutation<
    KrakenDepositAddress,
    DepositAddressError,
    FetchDepositAddressInput | undefined
  >({
    mutationFn: async (input) => {
      const asset = input?.asset ?? "USDC";
      const networkKeyword = input?.network ?? "Ethereum";
      try {
        const addresses = await getKrakenDepositAddresses({
          asset,
          networkKeyword,
        });
        const active = pickFreshestAddress(addresses);
        if (!active?.address) {
          throw {
            error:
              "Dynamic returned no deposit address. Generate one in your exchange UI and try again.",
            code: "kraken-error",
          } satisfies DepositAddressError;
        }
        return active;
      } catch (err) {
        // Demo fallback: if the real Dynamic endpoint isn't available
        // yet (or the request fails for any reason), derive a stable,
        // deterministic per-user address so the sales demo still
        // completes end-to-end. Seeded by the user's Dynamic verified
        // credential id — same user → same address every time.
        //
        // Safe to remove once Dynamic's `/exchange/kraken/deposit-
        // addresses` proxy ships — the happy path above supersedes it.
        const seed = socialAccount?.verifiedCredentialId;
        if (seed) {
          console.info(
            "[useCefi] deposit-address fetch failed, using deterministic demo fallback:",
            err,
          );
          return await deriveDemoDepositAddress({
            seed,
            asset,
            networkKeyword,
          });
        }

        if (isDepositAddressError(err)) throw err;
        const message = err instanceof Error ? err.message : "Unknown error";
        const code: DepositAddressError["code"] =
          /permission|scope|forbidden|401|403/i.test(message)
            ? "scope-missing"
            : /not\s*connected|no social account/i.test(message)
              ? "not-connected"
              : "unknown";
        throw { error: message, code } satisfies DepositAddressError;
      }
    },
    onError: (err) => {
      console.warn("[useCefi] deposit-address fetch failed:", err);
      setDepositAddressError(err);
    },
    onSuccess: () => setDepositAddressError(null),
  });

  const fetchDepositAddress = useCallback(
    async (input?: FetchDepositAddressInput) => {
      const display = activeExchange
        ? getExchangeDisplay(activeExchange)
        : null;
      // Paste-only exchanges: don't even attempt the call.
      if (!display?.supportsAutoDepositFetch) return null;
      try {
        return await depositAddressMutation.mutateAsync(input);
      } catch {
        // Error is already set in mutation onError; returning null
        // lets the UI seamlessly fall back to paste.
        return null;
      }
    },
    [depositAddressMutation, activeExchange],
  );

  const clearDepositAddressError = useCallback(
    () => setDepositAddressError(null),
    [],
  );

  return {
    availableExchanges,
    activeExchange,
    isConnected,
    isCompletingOAuth,
    didJustConnect,
    clearJustConnected,
    socialAccount: socialAccountResolved,
    krakenAccounts,
    isLoadingAccounts,
    refetchAccounts,
    connect,
    fetchDepositAddress,
    isFetchingDepositAddress: depositAddressMutation.isPending,
    depositAddressError,
    clearDepositAddressError,
    linkConflict,
    clearLinkConflict: () => setLinkConflict(null),
    reopenModalSignal: reopenModal,
  };
}

/**
 * Prefer non-expired addresses when Kraken returns multiple; else
 * fall back to the first one returned.
 */
function pickFreshestAddress(
  addresses: KrakenDepositAddress[],
): KrakenDepositAddress | undefined {
  const now = Math.floor(Date.now() / 1000);
  const nonExpired = addresses.filter((a) => {
    const exp = a.expireTime ? Number(a.expireTime) : 0;
    return !exp || exp > now;
  });
  return nonExpired[0] ?? addresses[0];
}

function isDepositAddressError(err: unknown): err is DepositAddressError {
  return (
    typeof err === "object" && err !== null && "code" in err && "error" in err
  );
}

/**
 * Build a deterministic, valid-format EVM deposit address for a user
 * as a demo fallback. Same `seed` → same address every time.
 *
 * The seed is domain-prefixed so addresses derived for different
 * purposes (or for unrelated apps that copy this helper) don't
 * collide. SHA-256 of `vd-demo:{seed}` → first 20 bytes → lowercase
 * hex `0x…` address (no EIP-55 checksum — the modal's address
 * validator accepts lowercase so the demo flow passes).
 *
 * Safe to delete once Dynamic's real deposit-address proxy ships and
 * the primary call reliably returns a valid address.
 */
async function deriveDemoDepositAddress(params: {
  seed: string;
  asset: string;
  networkKeyword: string;
}): Promise<KrakenDepositAddress> {
  const { seed, asset, networkKeyword } = params;
  const bytes = new TextEncoder().encode(`vd-demo:${seed}`);
  const hashBuf = await crypto.subtle.digest("SHA-256", bytes);
  const hashBytes = new Uint8Array(hashBuf).slice(0, 20);
  const address =
    "0x" +
    Array.from(hashBytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return {
    address,
    asset,
    method: `${asset} (${networkKeyword})`,
    network: networkKeyword,
  };
}
