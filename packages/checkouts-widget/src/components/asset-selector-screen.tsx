"use client";

/**
 * Asset Selector Screen
 *
 * Fetches the buyer's multichain balances via the SDK 1.4.0
 * `getBalances({ networkIds })` primitive — a flat-shape call that
 * works WITHOUT a checkout session token, transforms them into
 * `TokenAsset[]`, and renders a picker. Host apps pass the connected
 * `walletAccount`; the component handles chain discovery, network id
 * enumeration, loading skeletons, empty states, and icon fallback
 * rendering.
 *
 * The older `getMultichainBalances` path required auth and used a
 * nested response shape. 1.4.0's multichain `getBalances` is the
 * recommended primitive now — see
 * `dynamic-sdk/packages/client/src/modules/balances/getBalances/getBalances.ts`.
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
  /** Fires when the buyer picks a token. */
  onSelected: (token: TokenAsset) => void;
  /** Hide tokens whose USD value falls below this. Default 0. */
  minUsdValue?: number;
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
 * All network ids configured in the Dynamic dashboard for the given
 * chain family. Used to drive the balance-request payload — without it
 * the SDK has no idea which networks to query.
 */
function getEnabledNetworkIds(chain: WalletChain): number[] {
  try {
    const all = getNetworksData() as unknown as Array<{
      chain?: string;
      networkId?: number | string;
      id?: number | string;
    }>;
    if (!all?.length) return [];
    return all
      .filter((n) => n.chain === chain)
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

export default function AssetSelectorScreen({
  walletAccount,
  onSelected,
  minUsdValue = 0,
  initialTokensShown = 5,
  header,
  footer,
  skeletonCount = 3,
  className,
}: AssetSelectorScreenProps) {
  const [tokens, setTokens] = useState<TokenAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAccount?.address) return;
    const chain = getWalletChain(walletAccount);
    if (!chain) {
      setError("Unsupported wallet chain");
      return;
    }
    const networkIds = getEnabledNetworkIds(chain);
    if (!networkIds.length) {
      setError("No networks configured");
      return;
    }

    let cancelled = false;
    setTokens(null);
    setError(null);
    (async () => {
      try {
        // 1.3.0 multichain `getBalances`: accepts `networkIds: string[]`
        // and returns a flat `TokenBalance[]` across all requested
        // networks for the wallet's chain. Doesn't require a checkout
        // session token, unlike the older `getMultichainBalances`.
        const balances = (await getBalances({
          walletAccount,
          networkIds: networkIds.map(String),
          includeNative: true,
          includePrices: true,
          filterSpamTokens: true,
        })) as unknown as FlatTokenBalance[];
        if (cancelled) return;
        const assets = transformFlatBalancesToTokenAssets(balances, {
          minUsdValue,
          excludeZeroBalance: true,
          // Single-network responses can omit `networkId` on each
          // row; surface the only requested id as the fallback.
          fallbackNetworkId:
            networkIds.length === 1 ? networkIds[0] : undefined,
        });
        setTokens(assets);
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
  }, [walletAccount?.address, minUsdValue]);

  // Cap the visible list at ~`initialTokensShown` rows; everything past
  // that is reachable by scrolling. -2px on the height pulls the
  // partially-clipped next row into view as a visual hint that more is
  // available.
  const maxHeight =
    initialTokensShown * ROW_HEIGHT_PX +
    Math.max(0, initialTokensShown - 1) * ROW_GAP_PX -
    2;
  const shouldScroll = tokens !== null && tokens.length > initialTokensShown;

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
        {tokens === null ? (
          Array.from({ length: skeletonCount }).map((_, i) => (
            <TokenRowSkeleton key={i} />
          ))
        ) : error ? (
          <EmptyState title="Couldn't load balances" body={error} />
        ) : tokens.length === 0 ? (
          <EmptyState
            title="No spendable tokens"
            body="Switch wallets or top up to continue."
          />
        ) : (
          tokens.map((token) => (
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
  const [src, setSrc] = useState<string | undefined>(iconUrl);
  const [errored, setErrored] = useState(false);

  // Reset state when the asset changes (e.g. user switches wallet).
  useEffect(() => {
    setSrc(iconUrl);
    setErrored(false);
  }, [iconUrl]);

  const onError = useCallback(
    (_e: SyntheticEvent<HTMLImageElement>) => {
      if (fallback && src !== fallback) {
        setSrc(fallback);
        return;
      }
      setErrored(true);
    },
    [fallback, src],
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
