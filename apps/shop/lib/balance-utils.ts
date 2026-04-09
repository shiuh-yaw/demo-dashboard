/**
 * Balance Utilities
 *
 * Parses Dynamic SDK getMultichainBalances response into TokenAsset[]
 * for the checkout token selector.
 *
 * Simplified from apps/checkouts/lib/balance-utils.ts (no exchange/Kraken support).
 */

// =============================================================================
// TYPES
// =============================================================================

export interface TokenAsset {
  id: string;
  name: string;
  symbol: string;
  balance: string;
  rawBalance: string;
  decimals: number;
  usdValue: string;
  pricePerToken: number;
  iconUrl?: string;
  chainId: number;
  tokenAddress?: string;
}

interface ChainBalance {
  networks?: NetworkBalance[];
}

interface NetworkBalance {
  networkId: number;
  balances?: TokenBalanceRaw[];
}

interface TokenBalanceRaw {
  symbol?: string;
  name?: string;
  balance?: string;
  marketValue?: string;
  logoURI?: string;
  address?: string;
  decimals?: number;
}

interface MultichainBalanceResponse {
  chainBalances?: ChainBalance[];
}

export interface TokenFilterOptions {
  minUsdValue?: number;
  excludeZeroBalance?: boolean;
}

// =============================================================================
// TRANSFORM
// =============================================================================

function normalizeBalanceResponse(
  response: MultichainBalanceResponse | ChainBalance[] | unknown,
): ChainBalance[] {
  if (Array.isArray(response)) return response;
  return (response as MultichainBalanceResponse)?.chainBalances || [];
}

export function transformToTokenAssets(
  response: MultichainBalanceResponse | ChainBalance[] | unknown,
  options: TokenFilterOptions = {},
): TokenAsset[] {
  const { minUsdValue = 0, excludeZeroBalance = true } = options;
  const chainBalances = normalizeBalanceResponse(response);
  const assets: TokenAsset[] = [];

  for (const chain of chainBalances) {
    for (const network of chain.networks || []) {
      for (const token of (network as NetworkBalance).balances || []) {
        const balance = parseFloat(token.balance || "0");
        const marketValue = parseFloat(token.marketValue || "0");
        const decimals = token.decimals ?? 18;

        if (excludeZeroBalance && balance <= 0) continue;
        if (marketValue < minUsdValue) continue;

        const pricePerToken = balance > 0 ? marketValue / balance : 0;
        const rawBalance = BigInt(
          Math.floor(balance * Math.pow(10, decimals)),
        ).toString();

        assets.push({
          id: `${token.symbol}-${network.networkId}-${token.address || "native"}`,
          name: token.name || token.symbol || "Unknown Token",
          symbol: token.symbol || "???",
          balance: formatTokenBalance(balance),
          rawBalance,
          decimals,
          usdValue: formatUsdValue(marketValue),
          pricePerToken,
          iconUrl: token.logoURI,
          chainId: network.networkId,
          tokenAddress: token.address,
        });
      }
    }
  }

  assets.sort((a, b) => {
    const aValue = parseFloat(a.usdValue.replace(/[$,]/g, ""));
    const bValue = parseFloat(b.usdValue.replace(/[$,]/g, ""));
    return bValue - aValue;
  });

  return assets;
}

// =============================================================================
// FORMATTERS
// =============================================================================

function formatTokenBalance(balance: number): string {
  if (balance === 0) return "0";
  if (balance < 0.0001) return balance.toExponential(2);
  if (balance < 1) return balance.toFixed(6);
  if (balance < 1000) return balance.toFixed(4);
  return balance.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatUsdValue(amount: number): string {
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
