"use client";

/**
 * Asset Selector Screen
 *
 * Fetches the buyer's multichain balances via the SDK
 * `getBalances({ networkIds })` primitive and transforms them into
 * `TokenAsset[]`. Requires an authenticated Dynamic session — hosts
 * should connect with `verifyOnConnect={true}` (SIWE) so the SDK can
 * attach the JWT the balances API expects.
 *
 * @example
 * ```tsx
 * <AssetSelectorScreen
 *   walletAccount={wallet}
 *   onSelected={(token) => setFromToken(token)}
 *   minUsdValue={5}
 * />
 * ```
 */

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import {
  getBalances,
  getNetworksData,
  type WalletAccount,
} from "@dynamic-labs-sdk/client";
import { cn } from "@dynamic-demos/utils";
import {
  transformFlatBalancesToTokenAssets,
  type FlatTokenBalance,
  type TokenAsset,
} from "../lib/balance-utils";
import { ChainBadge } from "../lib/chain-icons";

export interface AssetSelectorScreenProps {
  /** Connected wallet account whose balances we fetch. */
  walletAccount: WalletAccount;
  /**
   * Additional wallet accounts whose balances are fetched and merged
   * into the token list alongside the primary `walletAccount`. Useful
   * for multi-chain scenarios where an EVM wallet and a Solana wallet
   * are both connected and the user should see a unified token list.
   */
  additionalWalletAccounts?: WalletAccount[];
  /** Fires when the buyer picks a token. */
  onSelected: (token: TokenAsset) => void;
  /** Hide tokens whose USD value falls below this. Default 0. */
  minUsdValue?: number;
  /**
   * Optional predicate to filter the token list after balances load.
   * Return `true` to keep the token, `false` to hide it. Applied
   * after `minUsdValue` filtering.
   */
  tokenFilter?: (token: TokenAsset) => boolean;
  /**
   * Approximate number of tokens visible before the list scrolls. Used
   * to compute the scroll container's `max-height`; the remaining
   * tokens are reachable by scrolling, not by clicking "show more".
   * Default 5.
   */
  initialTokensShown?: number;
  /** Optional content above the token list (eyebrow, title, back). */
  header?: ReactNode;
  /** Optional content below the token list. */
  footer?: ReactNode;
  /** Number of skeleton rows shown during load. Default 3. */
  skeletonCount?: number;
  /** Extra classes for the outer container. */
  className?: string;
}

type WalletChain = "EVM" | "SOL";

function getWalletChain(wallet: WalletAccount): WalletChain | null {
  // The SDK's WalletAccount.chain is typed as a specific literal per
  // chain extension; the runtime value is always one of "EVM" | "SOL"
  // for the chains this picker supports. Widen to string for the
  // comparison so the SOL branch isn't narrowed away at compile time.
  const chain = wallet.chain as string;
  if (chain === "EVM" || chain === "SOL") return chain as WalletChain;
  return null;
}

/**
 * All network ids configured in the Dynamic dashboard. When `chain` is
 * provided, only returns ids for that chain family. When omitted,
 * returns ids across ALL chain families — needed for multi-chain
 * wallets like MetaMask that support EVM + Solana simultaneously.
 */
function getEnabledNetworkIds(chain?: WalletChain): number[] {
  try {
    const all = getNetworksData() as unknown as Array<{
      chain?: string;
      networkId?: number | string;
      id?: number | string;
    }>;
    if (!all?.length) return [];
    return all
      .filter((n) => (chain ? n.chain === chain : true))
      .map((n) => {
        const id = n.networkId ?? n.id;
        return typeof id === "number" ? id : parseInt(String(id), 10);
      })
      .filter((id) => !Number.isNaN(id));
  } catch {
    return [];
  }
}

// Visual constants for the scroll-height calculation. Each token row is
// 32px icon + py-3 (24px) = ~62px tall; rows are separated by gap-2 (8px).
const ROW_HEIGHT_PX = 62;
const ROW_GAP_PX = 8;

/**
 * Fetch balances for a wallet account. Queries network IDs matching
 * the wallet's chain type first, then also attempts all other enabled
 * networks (multi-chain wallets like MetaMask may serve balances on
 * chains beyond their primary type). Failures on the secondary query
 * are silently ignored so a SOL wallet won't error on EVM networks.
 */
async function fetchWalletBalances(
  wallet: WalletAccount,
  minUsdValue: number,
): Promise<TokenAsset[]> {
  const chain = getWalletChain(wallet);
  if (!chain) return [];

  const primaryNetworkIds = getEnabledNetworkIds(chain);
  const allNetworkIds = getEnabledNetworkIds();
  const secondaryNetworkIds = allNetworkIds.filter(
    (id) => !primaryNetworkIds.includes(id),
  );

  if (!primaryNetworkIds.length && !secondaryNetworkIds.length) return [];

  const opts = (ids: number[]) => ({
    walletAccount: wallet,
    networkIds: ids.map(String),
    includeNative: true,
    includePrices: true,
    filterSpamTokens: true,
  });

  // Fetch primary chain balances (must succeed).
  const primaryBalances = primaryNetworkIds.length
    ? ((await getBalances(opts(primaryNetworkIds))) as unknown as FlatTokenBalance[])
    : [];

  // Attempt secondary networks; silently ignore errors.
  let secondaryBalances: FlatTokenBalance[] = [];
  if (secondaryNetworkIds.length) {
    try {
      secondaryBalances =
        (await getBalances(opts(secondaryNetworkIds))) as unknown as FlatTokenBalance[];
    } catch {
      // Expected for wallets that don't support these networks.
    }
  }

  const allBalances = [...primaryBalances, ...secondaryBalances];

  return transformFlatBalancesToTokenAssets(allBalances, {
    minUsdValue,
    excludeZeroBalance: true,
    fallbackNetworkId:
      allNetworkIds.length === 1 ? allNetworkIds[0] : undefined,
  });
}

export default function AssetSelectorScreen({
  walletAccount,
  additionalWalletAccounts,
  onSelected,
  minUsdValue = 0,
  tokenFilter,
  initialTokensShown = 5,
  header,
  footer,
  skeletonCount = 3,
  className,
}: AssetSelectorScreenProps) {
  const [tokens, setTokens] = useState<TokenAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stable key for additional wallets so the effect only re-fires when
  // the set of addresses actually changes.
  const additionalAddressesKey = additionalWalletAccounts
    ?.map((w) => w.address)
    .sort()
    .join(",") ?? "";

  useEffect(() => {
    if (!walletAccount?.address) return;
    const chain = getWalletChain(walletAccount);
    if (!chain) {
      setError("Unsupported wallet chain");
      return;
    }
    const networkIds = getEnabledNetworkIds();
    if (!networkIds.length) {
      setError("No networks configured");
      return;
    }

    let cancelled = false;
    setTokens(null);
    setError(null);
    (async () => {
      try {
        // Fetch balances from all wallets in parallel.
        const allWallets = [walletAccount, ...(additionalWalletAccounts ?? [])];
        // De-dup by address so we don't double-fetch the same wallet.
        const seen = new Set<string>();
        const unique = allWallets.filter((w) => {
          const addr = w.address.toLowerCase();
          if (seen.has(addr)) return false;
          seen.add(addr);
          return true;
        });

        const results = await Promise.allSettled(
          unique.map((w) => fetchWalletBalances(w, minUsdValue)),
        );
        if (cancelled) return;

        const rejections = results.filter(
          (r): r is PromiseRejectedResult => r.status === "rejected",
        );

        // Merge all successful results; de-dup by chainId+address.
        const merged = new Map<string, TokenAsset>();
        for (const result of results) {
          if (result.status !== "fulfilled") continue;
          for (const asset of result.value) {
            const key = `${asset.chainId}:${(asset.tokenAddress ?? asset.symbol).toLowerCase()}`;
            if (!merged.has(key)) {
              merged.set(key, asset);
            }
          }
        }

        if (merged.size === 0 && rejections.length > 0) {
          const first = rejections[0]?.reason;
          setError(
            first instanceof Error
              ? first.message
              : "Failed to load balances",
          );
          setTokens([]);
          return;
        }

        setTokens(Array.from(merged.values()));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load balances",
          );
          setTokens([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAccount?.address, additionalAddressesKey, minUsdValue]);

  // Apply the caller's filter predicate at render time so changes
  // don't require a balance refetch.
  const afterCallerFilter =
    tokens && tokenFilter ? tokens.filter(tokenFilter) : tokens;

  const filteredTokens = afterCallerFilter;

  // Cap the visible list at ~`initialTokensShown` rows; everything past
  // that is reachable by scrolling. -2px on the height pulls the
  // partially-clipped next row into view as a visual hint that more is
  // available.
  const maxHeight =
    initialTokensShown * ROW_HEIGHT_PX +
    Math.max(0, initialTokensShown - 1) * ROW_GAP_PX -
    2;
  const shouldScroll =
    filteredTokens !== null && filteredTokens.length > initialTokensShown;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {header}
      <div
        className={cn(
          "flex flex-col gap-2",
          shouldScroll && "overflow-y-auto pr-1",
        )}
        style={shouldScroll ? { maxHeight: `${maxHeight}px` } : undefined}
      >
        {filteredTokens === null ? (
          Array.from({ length: skeletonCount }).map((_, i) => (
            <TokenRowSkeleton key={i} />
          ))
        ) : error ? (
          <EmptyState title="Couldn't load balances" body={error} />
        ) : filteredTokens.length === 0 ? (
          <EmptyState
            title="No spendable tokens"
            body="Switch wallets or top up to continue."
          />
        ) : (
          filteredTokens.map((token) => (
            <TokenRow
              key={token.id}
              token={token}
              onClick={() => onSelected(token)}
            />
          ))
        )}
      </div>
      {footer}
    </div>
  );
}

function TokenRow({
  token,
  onClick,
}: {
  token: TokenAsset;
  onClick: () => void;
}) {
  // `pointer-events-none` on every descendant so the cursor stays as
  // the button's pointer everywhere inside the row. Without this the
  // cursor flickers between pointer / text / default as it crosses
  // text spans and the token icon `<img>`.
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl bg-[var(--widget-row-hover,#f4f5f7)] px-4 py-3 text-left transition-colors hover:brightness-95 [&_*]:pointer-events-none"
    >
      <span className="flex min-w-0 items-center gap-3">
        <TokenIcon
          iconUrl={token.iconUrl}
          fallback={token.iconUrlFallback}
          symbol={token.symbol}
          chainId={token.chainId}
        />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[15px] font-medium text-[var(--widget-fg,#0e121b)] truncate">
            {token.name}
          </span>
          <span className="text-[11px] text-[var(--widget-muted,#99a0ae)] truncate">
            {token.balance} {token.symbol}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-[15px] font-semibold text-[var(--widget-fg,#0e121b)] font-mono">
        {token.usdValue}
      </span>
    </button>
  );
}

/**
 * Well-known non-native tokens whose Iconify icon is reliable.
 * Tried BEFORE the SDK-supplied `iconUrl` because testnet tokens
 * often return a generic "?" placeholder that loads (HTTP 200) but
 * is visually meaningless — the `onError` fallback never fires.
 */
const WELL_KNOWN_ICON_SYMBOLS = new Set([
  "USDC",
  "USDT",
  "DAI",
  "BUSD",
  "WBTC",
  "LINK",
  "UNI",
  "AAVE",
]);

function iconifyCryptoUrl(symbol: string): string {
  return `https://api.iconify.design/cryptocurrency/${symbol.toLowerCase()}.svg`;
}

function TokenIcon({
  iconUrl,
  fallback,
  symbol,
  chainId,
}: {
  iconUrl?: string;
  fallback?: string;
  symbol: string;
  chainId: number;
}) {
  // For well-known tokens, prefer the iconify URL over the SDK-supplied
  // icon — testnet tokens often return a valid-but-useless "?" placeholder.
  const isWellKnown = WELL_KNOWN_ICON_SYMBOLS.has(symbol.toUpperCase());
  const effectiveUrl = isWellKnown ? iconifyCryptoUrl(symbol) : iconUrl;
  const effectiveFallback = isWellKnown ? (iconUrl ?? fallback) : fallback;

  const [src, setSrc] = useState<string | undefined>(effectiveUrl);
  const [errored, setErrored] = useState(false);

  // Reset state when the asset changes (e.g. user switches wallet).
  useEffect(() => {
    setSrc(effectiveUrl);
    setErrored(false);
  }, [effectiveUrl]);

  const onError = useCallback(
    (_e: SyntheticEvent<HTMLImageElement>) => {
      if (effectiveFallback && src !== effectiveFallback) {
        setSrc(effectiveFallback);
        return;
      }
      setErrored(true);
    },
    [effectiveFallback, src],
  );

  return (
    <span className="relative inline-flex h-8 w-8 shrink-0">
      {!src || errored ? (
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--widget-bg,#ffffff)] border border-[var(--widget-border,#e1e4ea)] text-[10px] font-mono font-semibold text-[var(--widget-muted,#99a0ae)]">
          {symbol.slice(0, 3).toUpperCase()}
        </span>
      ) : (
        <img
          src={src}
          alt=""
          onError={onError}
          className="h-8 w-8 rounded-full bg-[var(--widget-bg,#ffffff)] object-cover"
        />
      )}
      <ChainBadge chainId={chainId} />
    </span>
  );
}

function TokenRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--widget-row-hover,#f4f5f7)] px-4 py-3">
      <span className="flex items-center gap-3">
        <span className="h-8 w-8 rounded-full bg-[var(--widget-border,#e1e4ea)] animate-pulse" />
        <span className="flex flex-col gap-1">
          <span className="h-3 w-24 rounded bg-[var(--widget-border,#e1e4ea)] animate-pulse" />
          <span className="h-2 w-16 rounded bg-[var(--widget-border,#e1e4ea)] animate-pulse" />
        </span>
      </span>
      <span className="h-3 w-14 rounded bg-[var(--widget-border,#e1e4ea)] animate-pulse" />
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-[var(--widget-row-hover,#f4f5f7)] px-4 py-6 text-center">
      <p className="text-sm font-medium text-[var(--widget-fg,#0e121b)]">
        {title}
      </p>
      <p className="text-xs text-[var(--widget-muted,#99a0ae)]">{body}</p>
    </div>
  );
}
