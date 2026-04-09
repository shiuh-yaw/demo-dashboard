"use client";

import { useEffect, useState, useCallback } from "react";
import { Spinner } from "@dynamic-demos/ui";
import { Coins, ChevronDown } from "lucide-react";
import {
  getPrimaryWalletAccount,
  getBalances,
  getNetworksData,
  getActiveNetworkData,
  switchActiveNetwork,
} from "@/lib/checkout-sdk";
import { useCheckout, type TokenBalance } from "@/lib/checkout-context";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@dynamic-demos/utils";

interface NetworkOption {
  networkId: string;
  displayName: string;
  iconUrl: string;
}

export function TokenSelectScreen() {
  const { selectToken } = useCheckout();
  const { totalPrice } = useCart();
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networks, setNetworks] = useState<NetworkOption[]>([]);
  const [activeNetworkId, setActiveNetworkId] = useState<string>("");
  const [networkMenuOpen, setNetworkMenuOpen] = useState(false);

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    setError(null);

    const wallet = getPrimaryWalletAccount();
    if (!wallet) {
      setError("No wallet connected");
      setLoading(false);
      return;
    }

    try {
      const balances = await getBalances({
        walletAccount: wallet,
        includeNative: true,
        includePrices: true,
      });

      // Filter out tokens worth less than $0.01
      const filtered = balances.filter((t) => (t.marketValue ?? 0) >= 0.01);
      filtered.sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0));
      setTokens(filtered);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch balances");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load networks and initial balances
  useEffect(() => {
    // Get configured networks
    const allNetworks = getNetworksData() as unknown as NetworkOption[];
    if (allNetworks?.length) {
      setNetworks(
        allNetworks.map((n) => ({
          networkId: n.networkId,
          displayName: n.displayName,
          iconUrl: n.iconUrl,
        })),
      );
    }

    // Get active network
    const wallet = getPrimaryWalletAccount();
    if (wallet) {
      getActiveNetworkData({ walletAccount: wallet }).then(({ networkData }) => {
        if (networkData?.networkId) {
          setActiveNetworkId(String(networkData.networkId));
        }
      });
    }

    fetchBalances();
  }, [fetchBalances]);

  const handleNetworkSwitch = async (networkId: string) => {
    setNetworkMenuOpen(false);
    if (networkId === activeNetworkId) return;

    const wallet = getPrimaryWalletAccount();
    if (!wallet) return;

    try {
      await switchActiveNetwork({ walletAccount: wallet, networkId });
      setActiveNetworkId(networkId);
      await fetchBalances();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to switch network",
      );
    }
  };

  const activeNetwork = networks.find((n) => n.networkId === activeNetworkId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pay{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(totalPrice)}
          </span>{" "}
          — select a token
        </p>

        {/* Network selector */}
        {networks.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setNetworkMenuOpen(!networkMenuOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              {activeNetwork?.iconUrl && (
                <img
                  src={activeNetwork.iconUrl}
                  alt=""
                  className="h-4 w-4 rounded-full"
                />
              )}
              <span className="max-w-[80px] truncate">
                {activeNetwork?.displayName ?? "Network"}
              </span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {networkMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setNetworkMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                  {networks.map((network) => (
                    <button
                      key={network.networkId}
                      onClick={() => handleNetworkSwitch(network.networkId)}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-muted/50 transition-colors ${
                        network.networkId === activeNetworkId
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {network.iconUrl && (
                        <img
                          src={network.iconUrl}
                          alt=""
                          className="h-4 w-4 rounded-full"
                        />
                      )}
                      {network.displayName}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading balances...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : tokens.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
          <Coins className="h-10 w-10" />
          <p className="text-sm">No tokens with sufficient balance</p>
          <p className="text-xs">
            You need at least {formatCurrency(totalPrice)} to checkout
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-h-[216px] overflow-y-auto">
          {tokens.map((token, i) => (
            <button
              key={`${token.address}-${i}`}
              onClick={() => selectToken(token)}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
            >
              {token.logoURI ? (
                <img
                  src={token.logoURI}
                  alt=""
                  className="h-8 w-8 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {token.name ?? token.symbol}
                </p>
                <p className="text-xs text-muted-foreground">
                  {token.balance.toFixed(4)} {token.symbol}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                ${(token.marketValue ?? 0).toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
