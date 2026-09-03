"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useSession, wipePersistedSession } from "@/lib/session/store";
import type { Position, Provider } from "@/lib/session/types";
import { initialsOf, sleep } from "@/lib/format";
import { useMilestone } from "@/hooks/use-milestone";
import { BackendContext } from "./context";
import type { Backend, Progress, SignInHint } from "./types";
import { APY, addressFor, fakeTxHash, makeShares, makeWallet, uid } from "./sim";

const PROVIDER_LABEL: Record<Provider, string> = { google: "Google", apple: "Apple", email: "email" };
const DEFAULT_NAME = "Aisyah Rahman";
const DEFAULT_EMAIL = "aisyah.rahman@example.com";

/**
 * Staged backend: a faithful simulation of the 2-of-2 flow with no network.
 * Timings are tuned to read as real on stage without dragging.
 */
export function StagedBackendProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useSession();
  const milestone = useMilestone();
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const recoverFlow = useCallback(
    async (provider: Provider) => {
      const person = state.knownPerson;
      if (!person || !state.wallet) throw new Error("No account to recover.");
      dispatch({ type: "recovering", on: true });
      const steps = [
        `Verifying identity with ${PROVIDER_LABEL[provider]}`,
        "Locating the encrypted client-share backup",
        "Decrypting through the Encryption Proxy on this device",
        "Refreshing shares with the enclave · 2-of-2 restored",
      ];
      const waits = [800, 700, 1000, 1000];
      try {
        setBusy("Restoring your account");
        for (let i = 0; i < steps.length; i++) {
          setProgress({ label: steps[i]!, index: i, total: steps.length });
          await sleep(waits[i]!);
        }
        const now = Date.now();
        dispatch({ type: "signed-in", person: { ...person, provider } });
        dispatch({
          type: "recovered",
          wallet: { ...state.wallet, deviceId: "B", recoveredAt: now, shares: makeShares(state.wallet.address, "B", now, state.wallet.createdAt) },
        });
        dispatch({
          type: "activity",
          item: { id: uid(), at: now, kind: "recovered", title: "Restored on device B", detail: "Same address, same balance, same position. No seed phrase. The exchange held nothing." },
        });
        dispatch({ type: "beat-done", beat: 4 });
        milestone("wallet_recovered");
      } finally {
        setProgress(null);
        setBusy(null);
      }
    },
    [dispatch, state.knownPerson, state.wallet, milestone],
  );

  const finishSignIn = useCallback(
    async (provider: Provider, hint?: SignInHint) => {
      if (state.deviceLost) return recoverFlow(provider);
      const name = hint?.name?.trim() || DEFAULT_NAME;
      const email = hint?.email?.trim() || DEFAULT_EMAIL;
      dispatch({
        type: "signed-in",
        person: { userId: `sim_${addressFor(email).slice(2, 12)}`, name, email, provider, initials: initialsOf(name) },
      });
      dispatch({
        type: "activity",
        item: { id: uid(), at: Date.now(), kind: "signin", title: `Signed in with ${PROVIDER_LABEL[provider]}`, detail: email },
      });
      milestone("signed_in");
      // Distributed key generation happens behind the account setup - no interstitial.
      await run("Setting up your account", async () => {
        await sleep(1100);
        const now = Date.now();
        dispatch({ type: "wallet-ready", wallet: makeWallet(email, now) });
        dispatch({
          type: "activity",
          item: {
            id: uid(),
            at: now,
            kind: "wallet-created",
            title: "Account ready",
            detail: "2-of-2 key generated across this device and the enclave. No full key exists.",
          },
        });
        dispatch({ type: "beat-done", beat: 1 });
      });
    },
    [dispatch, run, milestone, state.deviceLost, recoverFlow],
  );

  const signInWithSocial = useCallback(
    async (provider: Provider, hint?: SignInHint) => {
      await run(`Signing in with ${PROVIDER_LABEL[provider]}`, () => sleep(700));
      await finishSignIn(provider, hint);
    },
    [run, finishSignIn],
  );

  const sendEmailCode = useCallback(
    async (email: string, hint?: SignInHint) => {
      await run("Sending your code", () => sleep(500));
      return { email, name: hint?.name };
    },
    [run],
  );

  const verifyEmailCode = useCallback(
    async (verification: unknown, code: string) => {
      const v = verification as { email: string; name?: string };
      await run("Verifying", async () => {
        await sleep(600);
        if (!/^\d{6}$/.test(code.trim())) throw new Error("Enter the 6-digit code from your email (any six digits work in staged mode).");
      });
      await finishSignIn("email", { email: v.email, name: v.name });
    },
    [run, finishSignIn],
  );

  const completeOAuthRedirect = useCallback(async () => false, []);

  const signOut = useCallback(async () => {
    dispatch({ type: "signed-out" });
  }, [dispatch]);

  const fund = useCallback(
    async (amount: number) =>
      run("Receiving testnet funds", async () => {
        await sleep(1400);
        dispatch({ type: "balances", balances: { usdc: state.balances.usdc + amount } });
        dispatch({
          type: "activity",
          item: { id: uid(), at: Date.now(), kind: "fund", title: "Deposit received", detail: "Rimau testnet faucet · Ethereum Sepolia", amount, txHash: fakeTxHash() },
        });
        milestone("wallet_funded");
      }),
    [dispatch, run, state.balances.usdc, milestone],
  );

  const openPosition = useCallback(
    async (protocol: Position["protocol"], amount: number) =>
      run(`Opening ${protocol} position`, async () => {
        if (amount > state.balances.usdc) throw new Error("Not enough balance for that position.");
        await sleep(1600);
        const txHash = fakeTxHash();
        const position: Position = { id: uid(), protocol, asset: "USDC", principal: amount, apy: APY[protocol], openedAt: Date.now(), txHash };
        dispatch({ type: "position-opened", position, debit: amount });
        dispatch({
          type: "activity",
          item: { id: uid(), at: Date.now(), kind: "earn-open", title: `Earn · ${protocol} USDC`, detail: "Signed on this device with the enclave. The exchange never touched the funds.", amount: -amount, txHash },
        });
        dispatch({ type: "beat-done", beat: 2 });
        milestone("position_opened", { protocol, asset: "USDC" });
      }),
    [dispatch, run, state.balances.usdc, milestone],
  );

  const transfer = useCallback(
    async (to: `0x${string}`, amount: number) =>
      run("Sending", async () => {
        if (amount > state.balances.usdc) throw new Error("Not enough balance to send that amount.");
        const sponsored = state.balances.eth === 0;
        milestone("send_initiated", { asset: "USDC", sponsored });
        await sleep(1800);
        const txHash = fakeTxHash();
        dispatch({ type: "balances", balances: { usdc: state.balances.usdc - amount } });
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
      }),
    [dispatch, run, state.balances.eth, state.balances.usdc, milestone],
  );

  const connectExternal = useCallback(
    async () =>
      run("Connecting MetaMask", async () => {
        await sleep(1200);
        const address = addressFor(`${state.person?.email ?? "anon"}:metamask`);
        dispatch({ type: "external-linked", external: { address, label: "MetaMask", linkedAt: Date.now() } });
        dispatch({
          type: "activity",
          item: { id: uid(), at: Date.now(), kind: "external-linked", title: "MetaMask linked", detail: "External wallet, same session, same policy surface." },
        });
        milestone("external_wallet_linked");
      }),
    [dispatch, run, state.person?.email, milestone],
  );

  const loseDevice = useCallback(async () => {
    dispatch({
      type: "activity",
      item: { id: uid(), at: Date.now(), kind: "device-lost", title: "Device A lost", detail: "Client share on device A is gone. The enclave share alone cannot sign." },
    });
    dispatch({ type: "device-lost" });
    milestone("device_lost");
  }, [dispatch, milestone]);

  const recover = useCallback(async (provider: Provider) => recoverFlow(provider), [recoverFlow]);

  const refreshBalances = useCallback(async () => {
    /* staged balances are already local */
  }, []);

  const hardReset = useCallback(async () => {
    wipePersistedSession();
    dispatch({ type: "reset", mode: "staged" });
  }, [dispatch]);

  const value = useMemo<Backend>(
    () => ({
      mode: "staged",
      ready: true,
      sessionActive: true,
      busy,
      progress,
      error,
      clearError: () => setError(null),
      auth: { emailEnabled: true, socialProviders: ["google", "apple"] },
      sponsorship: { nativeSponsorship: true, zerodevAccount: false, sepoliaSponsored: true, networkId: "evm-11155111" },
      signInWithSocial,
      sendEmailCode,
      verifyEmailCode,
      completeOAuthRedirect,
      signOut,
      canFaucet: true,
      fund,
      depositAddress: () => state.wallet?.address ?? null,
      openPosition,
      transfer,
      externalWalletOptions: [{ key: "metamask", name: "MetaMask" }],
      connectExternal,
      linkStepUp: null,
      submitLinkStepUpCode: async () => undefined,
      cancelLinkStepUp: () => undefined,
      loseDevice,
      recover,
      refreshBalances,
      hardReset,
    }),
    [busy, progress, error, signInWithSocial, sendEmailCode, verifyEmailCode, completeOAuthRedirect, signOut, fund, state.wallet?.address, openPosition, transfer, connectExternal, loseDevice, recover, refreshBalances, hardReset],
  );

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}
