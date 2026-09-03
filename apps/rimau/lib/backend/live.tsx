"use client";

/**
 * Live backend: the Dynamic JS SDK (`@dynamic-labs-sdk/client` 1.x) against a
 * sandbox environment on Ethereum Sepolia. The exchange UI is identical to
 * staged mode; only this file and `lib/dynamic/*` know the SDK.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getAddress } from "viem";
import { useSession, wipePersistedSession } from "@/lib/session/store";
import type { Person, Position, Provider, SessionState, SessionWallet, ShareInfo } from "@/lib/session/types";
import { initialsOf } from "@/lib/format";
import { useMilestone } from "@/hooks/use-milestone";
import { useAuth } from "@/hooks/use-auth";
import { useClientInitialized } from "@/hooks/use-client-initialized";
import {
  authenticateWithSocial,
  completeSocialAuthentication,
  detectOAuthRedirect,
  ensureEvmWaasWallet,
  getEmbeddedEvmWallet,
  getEnabledSocialProviders,
  getExternalWallet,
  getExternalWalletOptions,
  externalWalletDiagnostics,
  rescanExternalWallets,
  getInitStatus,
  linkExternalWallet,
  getSponsorshipDiagnostics,
  getUser,
  isEmailAuthEnabled,
  logout,
  onEvent,
  readBalances,
  sendEmailOTP,
  sendUsdc,
  verifyOTP,
  wipeSdkStorage,
  type OTPVerification,
  type SocialProvider,
  type UserLike,
} from "@/lib/dynamic";
import { BackendContext } from "./context";
import { APY, fakeTxHash, uid } from "./sim";
import { SEPOLIA_CHAIN_ID, SEPOLIA_NAME, type Backend, type Progress } from "./types";

const personFrom = (user: UserLike): Person => {
  const social = user.verifiedCredentials?.find((c) => c.oauthProvider);
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    social?.oauthDisplayName ||
    user.email ||
    social?.oauthEmails?.[0] ||
    "Rimau user";
  const email = user.email ?? social?.oauthEmails?.[0] ?? social?.email ?? "";
  const provider: Provider =
    social?.oauthProvider === "apple" ? "apple" : social?.oauthProvider === "google" ? "google" : "email";
  return { userId: user.id ?? "unknown", name, email, provider, initials: initialsOf(name) };
};

/** The wallet as the SDK describes it, with the key-share metadata the architecture view shows. */
const walletFrom = (user: UserLike, address: `0x${string}`, prev: SessionState): SessionWallet => {
  const now = Date.now();
  const cred = user.verifiedCredentials?.find((c) => c.address?.toLowerCase() === address.toLowerCase());
  const props = cred?.walletProperties;
  const keyShares = props?.keyShares ?? [];
  const deviceId = prev.device;
  const createdAt = prev.wallet?.address === address ? prev.wallet.createdAt : now;
  const credId = cred?.id?.slice(0, 8) ?? address.slice(2, 10);
  const shares: ShareInfo[] = [
    { id: `client:${credId}:${deviceId}`, location: "device", label: `Client share · device ${deviceId}`, encrypted: true, createdAt: now },
    { id: `server:${credId}`, location: "enclave", label: "Server share · hardware enclave (TEE)", encrypted: true, createdAt },
    ...keyShares.map((k, i) => ({
      id: k.id ?? `backup:${credId}:${i}`,
      location: "backup" as const,
      label: `Encrypted client-share backup · ${k.backupLocation ?? "dynamic"}`,
      backupLocation: k.backupLocation,
      encrypted: true,
      createdAt,
    })),
  ];
  return {
    address,
    chainId: SEPOLIA_CHAIN_ID,
    chainName: SEPOLIA_NAME,
    scheme: (props?.thresholdSignatureScheme as SessionWallet["scheme"] | undefined) ?? "TWO_OF_TWO",
    curve: "ECDSA · DKLs23",
    shares,
    backup: { location: keyShares[0]?.backupLocation ?? "dynamic", status: keyShares.length > 0 ? "backed-up" : "pending" },
    createdAt,
    deviceId,
    walletId: cred?.embeddedWalletId ?? cred?.id,
    version: props?.version,
  };
};

export function LiveBackendProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useSession();
  const milestone = useMilestone();
  const ready = useClientInitialized();
  const loggedIn = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletTick, setWalletTick] = useState(0);
  const [providerTick, setProviderTick] = useState(0);
  const seenUser = useRef<string | null>(null);
  const creating = useRef(false);

  // A failed init leaves the card with no sign-in methods and no explanation.
  // Name the likely causes instead: the SDK's own error is a bare "Failed to fetch".
  useEffect(() => {
    if (ready && getInitStatus() === "failed") {
      setError(
        "Could not reach Dynamic to load this environment. Check the environment id, that this origin is in the environment's CORS allowed origins, and that app.dynamicauth.com is reachable from this network.",
      );
    }
  }, [ready]);

  const run = useCallback(async <T,>(label: string, fn: () => Promise<T>) => {
    setBusy(label);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setBusy(null);
    }
  }, []);

  // Re-run the session sync whenever the SDK's wallet list moves.
  useEffect(() => {
    const unsubs = [
      onEvent({ event: "walletAccountsChanged", listener: () => setWalletTick((n) => n + 1) }),
      onEvent({ event: "userChanged", listener: () => setWalletTick((n) => n + 1) }),
    ];
    return () => unsubs.forEach((u) => u?.());
  }, []);

  // Browser wallets register asynchronously (EIP-6963 announcements); follow
  // the registry so the connect sheet lists them the moment they appear, and
  // re-ask once or twice after init for extensions that were slow to answer.
  useEffect(() => {
    const bump = () => setProviderTick((n) => n + 1);
    const unsubs = [
      onEvent({ event: "walletProviderRegistered", listener: bump }),
      onEvent({ event: "walletProviderChanged", listener: bump }),
      onEvent({ event: "walletProviderUnregistered", listener: bump }),
    ];
    return () => unsubs.forEach((u) => u?.());
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timers = [300, 2000].map((ms) =>
      setTimeout(() => {
        rescanExternalWallets();
        setProviderTick((n) => n + 1);
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [ready]);

  // Auth + embedded wallet → session. Also completes a beat-4 recovery.
  useEffect(() => {
    if (!ready || !loggedIn) return;
    const user = getUser();
    if (!user?.id) return;
    if (seenUser.current !== user.id) {
      seenUser.current = user.id;
      const person = personFrom(user);
      dispatch({ type: "signed-in", person });
      dispatch({ type: "activity", item: { id: uid(), at: Date.now(), kind: "signin", title: `Signed in with ${person.provider}`, detail: person.email } });
      milestone("signed_in");
    }
    const embedded = getEmbeddedEvmWallet();
    if (!embedded) {
      if (!creating.current) {
        creating.current = true;
        setBusy("Setting up your account");
        ensureEvmWaasWallet()
          .catch((e) => setError(e instanceof Error ? e.message : String(e)))
          .finally(() => {
            creating.current = false;
            setBusy(null);
            setWalletTick((n) => n + 1);
          });
      }
      return;
    }
    const address = getAddress(embedded.address);
    const sameWallet = state.wallet?.address === address;
    if (sameWallet && !state.deviceLost && state.wallet?.deviceId === state.device) return;
    const wallet = walletFrom(user, address, state);
    if (state.deviceLost && sameWallet) {
      const now = Date.now();
      dispatch({ type: "recovered", wallet: { ...wallet, recoveredAt: now } });
      dispatch({ type: "activity", item: { id: uid(), at: now, kind: "recovered", title: `Restored on device ${state.device}`, detail: "Client share re-issued from the encrypted backup. Same address. No seed phrase." } });
      dispatch({ type: "beat-done", beat: 4 });
      milestone("wallet_recovered");
      setProgress(null);
    } else {
      dispatch({ type: "wallet-ready", wallet });
      dispatch({ type: "activity", item: { id: uid(), at: Date.now(), kind: "wallet-created", title: "Account ready", detail: "2-of-2 TSS-MPC wallet · client share on this device, server share in the enclave." } });
      dispatch({ type: "beat-done", beat: 1 });
    }
  }, [ready, loggedIn, walletTick, state, dispatch, milestone]);

  // Any linked non-embedded wallet is the "bring your own" wallet (beat 2 curveball).
  useEffect(() => {
    if (!ready || !loggedIn) return;
    const ext = getExternalWallet();
    if (!ext) return;
    const address = getAddress(ext.address);
    if (state.external?.address === address) return;
    const label = getExternalWalletOptions().find((o) => o.key === ext.walletProviderKey)?.name ?? ext.walletProviderKey;
    dispatch({ type: "external-linked", external: { address, label, linkedAt: Date.now() } });
    dispatch({ type: "activity", item: { id: uid(), at: Date.now(), kind: "external-linked", title: `${label} linked`, detail: "External wallet, same session, same policy surface." } });
    milestone("external_wallet_linked");
  }, [ready, loggedIn, walletTick, state.external?.address, dispatch, milestone]);

  const refreshBalances = useCallback(async () => {
    const address = state.wallet?.address;
    if (!address) return;
    const b = await readBalances(address);
    dispatch({ type: "balances", balances: b });
    if (b.usdc > 0 && state.balances.usdc === 0) milestone("wallet_funded");
  }, [state.wallet?.address, state.balances.usdc, dispatch, milestone]);

  useEffect(() => {
    if (!state.wallet) return;
    refreshBalances().catch(() => undefined);
    const t = setInterval(() => refreshBalances().catch(() => undefined), 10_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll per wallet, not per balance
  }, [state.wallet?.address]);

  const signInWithSocial = useCallback(
    async (provider: Provider) =>
      run(`Signing in with ${provider}`, async () => {
        if (provider === "email") throw new Error("Use the email form to sign in with a one-time code.");
        if (state.deviceLost) {
          dispatch({ type: "recovering", on: true });
          setProgress({ label: `Verifying identity with ${provider}`, index: 0, total: 3 });
        }
        await authenticateWithSocial({ provider: provider as SocialProvider, redirectUrl: `${window.location.origin}/` });
      }),
    [run, state.deviceLost, dispatch],
  );

  const sendEmailCode = useCallback(
    async (email: string) => run("Sending your code", () => sendEmailOTP({ email })),
    [run],
  );

  const verifyEmailCode = useCallback(
    async (verification: unknown, code: string) =>
      run("Verifying", async () => {
        if (state.deviceLost) {
          dispatch({ type: "recovering", on: true });
          setProgress({ label: "Restoring the client share from the encrypted backup", index: 1, total: 3 });
        }
        await verifyOTP({ otpVerification: verification as OTPVerification, verificationToken: code.trim() });
      }),
    [run, state.deviceLost, dispatch],
  );

  const completeOAuthRedirect = useCallback(async () => {
    if (!(await detectOAuthRedirect())) return false;
    await run("Finishing sign-in", async () => {
      if (state.deviceLost) {
        dispatch({ type: "recovering", on: true });
        setProgress({ label: "Restoring the client share from the encrypted backup", index: 1, total: 3 });
      }
      await completeSocialAuthentication();
    });
    return true;
  }, [run, state.deviceLost, dispatch]);

  const signOut = useCallback(async () => {
    await logout();
    seenUser.current = null;
    dispatch({ type: "signed-out" });
  }, [dispatch]);

  const fund = useCallback(async () => {
    throw new Error("Live mode has no faucet. Send Sepolia USDC to the deposit address; the balance updates on its own.");
  }, []);

  const openPosition = useCallback(
    async (protocol: Position["protocol"], amount: number) =>
      run(`Opening ${protocol} position`, async () => {
        if (amount > state.balances.usdc) throw new Error("Not enough balance for that position.");
        // Position ledger is exchange-side in this build; the Earn API is wired server-side in production.
        await new Promise((r) => setTimeout(r, 1200));
        const position: Position = { id: uid(), protocol, asset: "USDC", principal: amount, apy: APY[protocol], openedAt: Date.now(), txHash: fakeTxHash() };
        dispatch({ type: "position-opened", position, debit: 0 });
        dispatch({ type: "activity", item: { id: uid(), at: Date.now(), kind: "earn-open", title: `Earn · ${protocol} USDC`, detail: "Position recorded (simulated ledger in this build).", amount: -amount, txHash: position.txHash } });
        dispatch({ type: "beat-done", beat: 2 });
        milestone("position_opened", { protocol, asset: "USDC" });
      }),
    [run, state.balances.usdc, dispatch, milestone],
  );

  const transfer = useCallback(
    async (to: `0x${string}`, amount: number) =>
      run("Sending", async () => {
        milestone("send_initiated", { asset: "USDC" });
        const { txHash, sponsored } = await sendUsdc(to, amount);
        dispatch({
          type: "activity",
          item: {
            id: uid(),
            at: Date.now(),
            kind: "transfer",
            title: "Sent to Kopi & Co.",
            detail: sponsored ? "Network fee sponsored · Dynamic 7702 relayer" : "Network fee paid from balance",
            amount: -amount,
            txHash,
            sponsored,
          },
        });
        dispatch({ type: "beat-done", beat: 3 });
        milestone("send_completed", { asset: "USDC", sponsored });
        setTimeout(() => refreshBalances().catch(() => undefined), 4000);
      }),
    [run, dispatch, milestone, refreshBalances],
  );

  const externalWalletOptions = useMemo(
    () => (ready ? getExternalWalletOptions() : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- providers appear as the client discovers them
    [ready, walletTick, providerTick],
  );
  const externalWalletHint = useMemo(
    () => (ready ? externalWalletDiagnostics() : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- same triggers as the options list
    [ready, walletTick, providerTick],
  );
  const rescan = useCallback(() => {
    rescanExternalWallets();
    setProviderTick((n) => n + 1);
  }, []);

  const connectExternal = useCallback(
    async (walletProviderKey?: string) =>
      run("Connecting wallet", async () => {
        const key = walletProviderKey ?? externalWalletOptions[0]?.key;
        if (!key) throw new Error("No browser wallet was found. Install MetaMask (or another EVM wallet extension) in this browser, then try again.");
        await linkExternalWallet(key);
        setWalletTick((n) => n + 1);
      }),
    [run, externalWalletOptions],
  );

  const loseDevice = useCallback(async () => {
    dispatch({ type: "activity", item: { id: uid(), at: Date.now(), kind: "device-lost", title: "Device lost", detail: "Client share and session discarded on this device. The enclave share alone cannot sign." } });
    await logout();
    await wipeSdkStorage();
    seenUser.current = null;
    dispatch({ type: "device-lost" });
    milestone("device_lost");
  }, [dispatch, milestone]);

  const recover = useCallback(async (provider: Provider) => signInWithSocial(provider), [signInWithSocial]);

  const hardReset = useCallback(async () => {
    try {
      await logout();
    } catch {
      /* ignore */
    }
    await wipeSdkStorage();
    wipePersistedSession();
    seenUser.current = null;
    dispatch({ type: "reset", mode: "live" });
  }, [dispatch]);

  const auth = useMemo(
    () => ({
      emailEnabled: ready ? isEmailAuthEnabled() : true,
      socialProviders: ready ? getEnabledSocialProviders() : [],
    }),
    [ready],
  );

  const sponsorship = useMemo(
    () => (ready && loggedIn ? getSponsorshipDiagnostics() : { nativeSponsorship: false, zerodevAccount: false, sepoliaSponsored: false }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read when the wallet list moves
    [ready, loggedIn, walletTick],
  );

  const value = useMemo<Backend>(
    () => ({
      mode: "live",
      ready,
      sessionActive: ready && loggedIn,
      busy,
      progress,
      error,
      clearError: () => setError(null),
      auth,
      sponsorship,
      signInWithSocial,
      sendEmailCode,
      verifyEmailCode,
      completeOAuthRedirect,
      signOut,
      canFaucet: false,
      fund,
      depositAddress: () => state.wallet?.address ?? null,
      openPosition,
      transfer,
      externalWalletOptions,
      connectExternal,
      rescanExternalWallets: rescan,
      externalWalletHint,
      loseDevice,
      recover,
      refreshBalances,
      hardReset,
    }),
    [ready, loggedIn, busy, progress, error, auth, sponsorship, signInWithSocial, sendEmailCode, verifyEmailCode, completeOAuthRedirect, signOut, fund, state.wallet?.address, openPosition, transfer, externalWalletOptions, connectExternal, rescan, externalWalletHint, loseDevice, recover, refreshBalances, hardReset],
  );

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}
