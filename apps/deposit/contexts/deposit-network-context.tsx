/**
 * Client-side network context with wallet sync.
 *
 * Combines network selection (persisted to localStorage) with
 * bi-directional sync to the external wallet via Dynamic SDK events.
 *
 * When the user switches networks in MetaMask, we detect it and either
 * update our select (supported chain) or show a mismatch warning.
 * When the user changes our select, we tell MetaMask to switch too.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  onEvent,
  offEvent,
  getExternalEvmWalletAccount,
  getActiveNetworkData,
  switchActiveNetwork,
  getNetworksData,
} from "@/lib/dynamic";
import {
  DEPOSIT_NETWORK_STORAGE_KEY,
  DEPOSIT_CHAIN_IDS,
  defaultDepositNetworkFromEnv,
  chainIdFromNetworkId,
  depositNetworkFromNetworkId,
  depositNetworkLabel,
  isDepositNetwork,
  type DepositNetwork,
} from "@/lib/deposit-network";

interface DepositNetworkContextValue {
  network: DepositNetwork;
  setNetwork: (network: DepositNetwork) => void;
  /** Also tells the external wallet to switch. */
  setNetworkAndSync: (network: DepositNetwork) => Promise<void>;
  /** The external wallet is on a chain we don't support for deposits. */
  walletNetworkMismatch: boolean;
  /** Human-readable warning when there's a mismatch. */
  mismatchMessage: string | null;
}

const DepositNetworkContext = createContext<DepositNetworkContextValue | null>(
  null,
);

export function DepositNetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkRaw] = useState<DepositNetwork>(
    defaultDepositNetworkFromEnv,
  );
  const [walletNetworkMismatch, setWalletNetworkMismatch] = useState(false);
  const [mismatchMessage, setMismatchMessage] = useState<string | null>(null);
  const suppressNextEvent = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(DEPOSIT_NETWORK_STORAGE_KEY);
    if (stored !== null && isDepositNetwork(stored)) {
      setNetworkRaw(stored);
    }
  }, []);

  const setNetwork = useCallback((next: DepositNetwork) => {
    setNetworkRaw(next);
    localStorage.setItem(DEPOSIT_NETWORK_STORAGE_KEY, next);
  }, []);

  // Listen for external wallet network changes (e.g. user switches in MetaMask)
  useEffect(() => {
    const listener = async () => {
      if (suppressNextEvent.current) {
        suppressNextEvent.current = false;
        return;
      }

      const wallet = getExternalEvmWalletAccount();
      if (!wallet) return;

      const { networkData } = await getActiveNetworkData({
        walletAccount: wallet,
      });
      if (!networkData) return;

      const detected = depositNetworkFromNetworkId(networkData.networkId);
      if (detected) {
        setWalletNetworkMismatch(false);
        setMismatchMessage(null);
        if (detected !== network) {
          setNetwork(detected);
        }
      } else {
        const walletName =
          networkData.displayName ??
          (networkData as { name?: string }).name ??
          "unknown network";
        setWalletNetworkMismatch(true);
        setMismatchMessage(
          `Your wallet is on ${walletName}. Switch to ${depositNetworkLabel(network)} to send deposits.`,
        );
      }
    };

    onEvent({ event: "walletProviderChanged", listener });
    return () => {
      offEvent({ event: "walletProviderChanged", listener });
    };
  }, [network, setNetwork]);

  const setNetworkAndSync = useCallback(
    async (next: DepositNetwork) => {
      setNetwork(next);
      setWalletNetworkMismatch(false);
      setMismatchMessage(null);

      const wallet = getExternalEvmWalletAccount();
      if (!wallet) return;

      const targetChainId = DEPOSIT_CHAIN_IDS[next];
      const networks = getNetworksData();
      const targetNetwork = networks.find(
        (n) => chainIdFromNetworkId(n.networkId) === targetChainId,
      );
      if (!targetNetwork) return;

      suppressNextEvent.current = true;
      try {
        await switchActiveNetwork({
          networkId: targetNetwork.networkId,
          walletAccount: wallet,
        });
      } catch {
        suppressNextEvent.current = false;
      }
    },
    [setNetwork],
  );

  return (
    <DepositNetworkContext.Provider
      value={{
        network,
        setNetwork,
        setNetworkAndSync,
        walletNetworkMismatch,
        mismatchMessage,
      }}
    >
      {children}
    </DepositNetworkContext.Provider>
  );
}

export function useDepositNetwork(): DepositNetworkContextValue {
  const ctx = useContext(DepositNetworkContext);
  if (!ctx) {
    throw new Error(
      "useDepositNetwork must be used within DepositNetworkProvider",
    );
  }
  return ctx;
}
