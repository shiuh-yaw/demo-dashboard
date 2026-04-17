"use client";

/**
 * Payout Context
 *
 * Shared state for the payout flow:
 * - defaultMethod: persisted to Dynamic metadata (cross-device),
 *   cached in localStorage for instant first paint
 * - walletAddress / walletProvider: same story — persisted to
 *   Dynamic metadata so the host's wallet selection survives
 *   logout/login on any device, with a localStorage cache so the
 *   UI doesn't flash an empty state while `/api/preferences`
 *   resolves
 * - isModalOpen: whether the payout modal is open
 *
 * Embedded wallets are verified against Dynamic on every
 * `walletAccountsChanged` event — if the wallet was deleted in
 * Dynamic, the stored address is cleared here and in metadata.
 * CeFi wallets (provider !== "embedded") live outside Dynamic's
 * account store so they're kept until the user explicitly
 * reconnects.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { PayoutMethod } from "@/lib/constants";
import { DEFAULT_METHOD_STORAGE_KEY } from "@/lib/constants";
import {
  getPrimarySmartEvmAccount,
  getWalletAccounts,
  isEvmWalletAccount,
  onEvent,
} from "@/lib/dynamic";

const LS_WALLET_ADDR = "vd_wallet_address";
const LS_WALLET_PROV = "vd_wallet_provider";

interface PayoutContextValue {
  defaultMethod: PayoutMethod;
  setDefaultMethod: (method: PayoutMethod) => void;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  walletAddress: string | null;
  /** "coinbase" | "revolut" | "robinhood" | "embedded" | ... */
  walletProvider: string | null;
  setWallet: (address: string, provider: string) => void;
  clearWallet: () => void;
}

const PayoutContext = createContext<PayoutContextValue | null>(null);

interface PayoutProviderProps {
  children: ReactNode;
}

interface PreferencesResponse {
  defaultMethod?: string | null;
  walletAddress?: string | null;
  walletProvider?: string | null;
}

/**
 * PUT a partial preferences payload to the server. Fire-and-forget:
 * localStorage is the cache, Dynamic is the source of truth.
 * Failures fall back silently — the local cache already reflects
 * what the user did.
 */
function persistPreferences(patch: {
  defaultMethod?: PayoutMethod | null;
  walletAddress?: string | null;
  walletProvider?: string | null;
}): void {
  fetch("/api/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).catch(() => {});
}

export function PayoutProvider({ children }: PayoutProviderProps) {
  const [defaultMethod, setDefaultMethodState] =
    useState<PayoutMethod>("bank");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<string | null>(null);

  // Restore persisted preferences on mount.
  // 1. Hydrate from localStorage synchronously so the UI renders
  //    the previous state without a flash.
  // 2. Then pull the authoritative copy from Dynamic metadata and
  //    override if it differs (cross-device + post-logout recovery).
  useEffect(() => {
    const cachedAddr = localStorage.getItem(LS_WALLET_ADDR);
    const cachedProv = localStorage.getItem(LS_WALLET_PROV);
    const cachedMethod = localStorage.getItem(
      DEFAULT_METHOD_STORAGE_KEY,
    ) as PayoutMethod | null;
    if (cachedAddr) setWalletAddress(cachedAddr);
    if (cachedProv) setWalletProvider(cachedProv);
    if (
      cachedMethod &&
      (["bank", "wallet", "card"] as string[]).includes(cachedMethod)
    ) {
      setDefaultMethodState(cachedMethod);
    }

    fetch("/api/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PreferencesResponse | null) => {
        if (!data) return;

        if (
          data.defaultMethod &&
          ["bank", "wallet", "card"].includes(data.defaultMethod)
        ) {
          const next = data.defaultMethod as PayoutMethod;
          setDefaultMethodState(next);
          localStorage.setItem(DEFAULT_METHOD_STORAGE_KEY, next);
        }

        if (data.walletAddress && data.walletProvider) {
          setWalletAddress(data.walletAddress);
          setWalletProvider(data.walletProvider);
          localStorage.setItem(LS_WALLET_ADDR, data.walletAddress);
          localStorage.setItem(LS_WALLET_PROV, data.walletProvider);
        }
      })
      .catch(() => {}); // silent — cache already applied
  }, []);

  // Keep embedded wallet in sync with Dynamic:
  // - if the wallet is removed in Dynamic, clear it here + in
  //   metadata and fall the default back to "bank" so the payout
  //   UI doesn't point at a wallet that no longer exists
  // - on logout, clear local state (metadata stays put for the
  //   next login — that's the whole point of moving this off
  //   localStorage)
  //
  // Sync is INTENTIONALLY conservative: we only clear when the SDK
  // clearly has accounts loaded AND the stored wallet isn't among
  // them. If `getWalletAccounts()` returns empty we can't tell the
  // difference between "user just logged in, accounts still hydrating"
  // and "user deleted their last wallet", so we leave state alone —
  // the previous bug was eagerly clearing during the post-login
  // hydration window, which wiped the selection we'd just restored
  // from Dynamic metadata.
  useEffect(() => {
    function syncEmbeddedWallet() {
      const storedProvider = localStorage.getItem(LS_WALLET_PROV);
      const storedAddress = localStorage.getItem(LS_WALLET_ADDR);
      if (storedProvider !== "embedded" || !storedAddress) return;

      const accounts = getWalletAccounts();
      // SDK hasn't given us anything yet — don't clobber state.
      if (accounts.length === 0) return;

      // Auto-migrate stored EOA → ZeroDev kernel address. When the
      // ZeroDev extension finishes registering (async, post-init),
      // `walletAccountsChanged` fires and the kernel account appears
      // alongside the EOA. If we previously stored the EOA address,
      // the on-chain balance reads and `sendUserOperation` calls
      // would target the wrong account. Swapping in the kernel
      // address here keeps all downstream flows aligned without
      // forcing the user to re-create their wallet.
      const smartAccount = getPrimarySmartEvmAccount();
      if (
        smartAccount?.address &&
        smartAccount.address.toLowerCase() !== storedAddress.toLowerCase()
      ) {
        setWalletAddress(smartAccount.address);
        localStorage.setItem(LS_WALLET_ADDR, smartAccount.address);
        persistPreferences({
          walletAddress: smartAccount.address,
          walletProvider: "embedded",
        });
        return;
      }

      const stillPresent = accounts.some(
        (w) => w.address?.toLowerCase() === storedAddress.toLowerCase(),
      );
      if (stillPresent) return;

      // Also keep us safe when the stored address is an older
      // embedded wallet but the SDK surfaces a different one under
      // the same account — only clear if no EVM wallet is present
      // at all. Otherwise treat the new primary EVM wallet as the
      // replacement elsewhere in the app.
      const hasAnyEvmWallet = accounts.some((w) => isEvmWalletAccount(w));
      if (hasAnyEvmWallet) return;

      setWalletAddress(null);
      setWalletProvider(null);
      localStorage.removeItem(LS_WALLET_ADDR);
      localStorage.removeItem(LS_WALLET_PROV);

      const storedMethod = localStorage.getItem(
        DEFAULT_METHOD_STORAGE_KEY,
      ) as PayoutMethod | null;
      if (storedMethod === "wallet") {
        setDefaultMethodState("bank");
        localStorage.setItem(DEFAULT_METHOD_STORAGE_KEY, "bank");
        persistPreferences({
          defaultMethod: "bank",
          walletAddress: null,
          walletProvider: null,
        });
      } else {
        persistPreferences({
          walletAddress: null,
          walletProvider: null,
        });
      }
    }

    function handleLogout() {
      setWalletAddress(null);
      setWalletProvider(null);
      localStorage.removeItem(LS_WALLET_ADDR);
      localStorage.removeItem(LS_WALLET_PROV);
      // defaultMethod + wallet selection intentionally preserved in
      // Dynamic metadata — restored on next login.
    }

    // Only subscribe to `walletAccountsChanged` — firing on
    // `userChanged` too would wake this up during the post-login
    // hydration window, when accounts haven't finished loading but
    // `storedProvider` has just been restored from Dynamic metadata.
    // The deletion case we care about (wallet removed in Dynamic)
    // always emits `walletAccountsChanged`, so we don't lose coverage.
    const unsubWallet = onEvent({
      event: "walletAccountsChanged",
      listener: syncEmbeddedWallet,
    });
    const unsubLogout = onEvent({
      event: "logout",
      listener: handleLogout,
    });

    return () => {
      unsubWallet?.();
      unsubLogout?.();
    };
  }, []);

  const setDefaultMethod = useCallback((method: PayoutMethod) => {
    setDefaultMethodState(method);
    localStorage.setItem(DEFAULT_METHOD_STORAGE_KEY, method);
    persistPreferences({ defaultMethod: method });
  }, []);

  const setWallet = useCallback(
    (address: string, provider: string) => {
      setWalletAddress(address);
      setWalletProvider(provider);
      localStorage.setItem(LS_WALLET_ADDR, address);
      localStorage.setItem(LS_WALLET_PROV, provider);

      // Adding a wallet is an explicit intent to receive USDC
      // payouts — promote it to the default method so the user
      // doesn't have to tap "Set as default" immediately after.
      setDefaultMethodState("wallet");
      localStorage.setItem(DEFAULT_METHOD_STORAGE_KEY, "wallet");

      // Single metadata write covers all three changes so we don't
      // pay for two round-trips back to Dynamic.
      persistPreferences({
        defaultMethod: "wallet",
        walletAddress: address,
        walletProvider: provider,
      });
    },
    [],
  );

  const clearWallet = useCallback(() => {
    setWalletAddress(null);
    setWalletProvider(null);
    localStorage.removeItem(LS_WALLET_ADDR);
    localStorage.removeItem(LS_WALLET_PROV);

    // If the wallet was the default method, fall back to bank so
    // the payout UI never points at a removed wallet. Leave other
    // defaults ("card") alone — the user picked those
    // independently.
    setDefaultMethodState((current) => {
      if (current !== "wallet") {
        persistPreferences({
          walletAddress: null,
          walletProvider: null,
        });
        return current;
      }
      localStorage.setItem(DEFAULT_METHOD_STORAGE_KEY, "bank");
      persistPreferences({
        defaultMethod: "bank",
        walletAddress: null,
        walletProvider: null,
      });
      return "bank";
    });
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  return (
    <PayoutContext.Provider
      value={{
        defaultMethod,
        setDefaultMethod,
        isModalOpen,
        openModal,
        closeModal,
        walletAddress,
        walletProvider,
        setWallet,
        clearWallet,
      }}
    >
      {children}
    </PayoutContext.Provider>
  );
}

export function usePayoutContext(): PayoutContextValue {
  const ctx = useContext(PayoutContext);
  if (!ctx) {
    throw new Error("usePayoutContext must be used within PayoutProvider");
  }
  return ctx;
}
