"use client";

/**
 * Wallet Picker Screen
 *
 * Two mutually-exclusive views:
 *   1. Installed wallets — discovered via the SDK's EIP-6963 + WaaS
 *      providers, deduped by brand. Each row connects through
 *      `connectAndVerifyWithWalletProvider`.
 *   2. Discovered wallets — the WalletConnect catalog, surfaced behind
 *      a "Show more wallets" gate so the initial render stays fast.
 *      Each row routes through the chain-matching WC connect function
 *      (`...WithWalletConnectEvm` for `chain: "EVM"` entries,
 *      `...WithWalletConnectSolana` for `chain: "SOL"`). Hosts must
 *      register the matching extension on their Dynamic client
 *      (`addWalletConnectEvmExtension` / `addWalletConnectSolanaExtension`).
 *
 * Host apps pass `onConnected` to receive the connected `WalletAccount`
 * and own the next-step navigation themselves.
 *
 * @example
 * ```tsx
 * <WalletPickerScreen
 *   onConnected={(wallet) => setWallet(wallet)}
 *   header={<EyebrowAndTitle />}
 *   preferredChain="EVM"
 * />
 * ```
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  connectAndVerifyWithWalletProvider,
  connectWithWalletProvider,
  getAvailableWalletProvidersData,
  getPrimaryWalletAccount,
  offEvent,
  onEvent,
  type WalletAccount,
  type WalletConnectCatalogWallet,
  type WalletProviderData,
} from "@dynamic-labs-sdk/client";
import {
  connectAndVerifyWithWalletConnectEvm,
  connectWithWalletConnectEvm,
} from "@dynamic-labs-sdk/evm/wallet-connect";
import {
  connectAndVerifyWithWalletConnectSolana,
  connectWithWalletConnectSolana,
} from "@dynamic-labs-sdk/solana/wallet-connect";
import { cn } from "@dynamic-demos/utils";
import { useWalletConnectCatalog } from "../hooks/use-wallet-connect-catalog";
import {
  buildCatalogGroups,
  pickWalletForChain,
  type CatalogGroup,
} from "../lib/wallet-catalog";
import { groupProviders, type WalletGroup } from "../lib/wallet-providers";

export interface WalletPickerScreenProps {
  /** Fires when a wallet successfully connects. */
  onConnected: (wallet: WalletAccount) => void;
  /** Eyebrow / title block above the installed-wallets list. */
  header?: ReactNode;
  /** Optional content above the installed list (e.g. exchange rows). */
  extrasBefore?: ReactNode;
  /** Optional content below the installed list, above the "Show more" button. */
  extrasAfter?: ReactNode;
  /**
   * Pre-select this chain inside a group that spans multiple chains.
   * Default `"EVM"` so payment Flows targeting USDC-on-Base land on the
   * EVM provider when a wallet exposes both EVM + Solana.
   */
  preferredChain?: string;
  /** Approximate row count before the discovered list scrolls. Default 5. */
  initialMoreWalletsShown?: number;
  verifyOnConnect?: boolean;
  /** Extra classes for the outer container. */
  className?: string;
}

const ROW_HEIGHT_PX = 62;
const ROW_GAP_PX = 8;

type View = "installed" | "discovered";

export default function WalletPickerScreen({
  onConnected,
  header,
  extrasBefore,
  extrasAfter,
  preferredChain = "EVM",
  initialMoreWalletsShown = 5,
  verifyOnConnect = true,
  className,
}: WalletPickerScreenProps) {
  // Read installed providers synchronously at mount so the empty-state
  // branch below can decide whether to skip straight to the
  // WalletConnect catalog (see the `view` initializer). On SSR
  // `window` is undefined and the SDK call is a no-op.
  const [providers] = useState<WalletProviderData[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return getAvailableWalletProvidersData();
    } catch {
      return [];
    }
  });
  // Mobile / headless contexts have no browser-extension wallets to
  // detect — landing on an empty "installed" view forces an extra
  // click through "Show more wallets" before the user can actually
  // connect anything. Skip that step: if no REAL extension was
  // detected (Coinbase Base Account et al. always-present hosted
  // providers don't count — they aren't actually installed) AND the
  // host didn't supply alternate connect rows (`extrasBefore`/
  // `extrasAfter`, e.g. exchange OAuth tiles), open directly on the
  // WalletConnect catalog. Hosted providers re-surface at the top of
  // the discovered view so we don't lose them.
  const [view, setView] = useState<View>(() => {
    const hasInstalledExtension = providers.some(
      (p) => p.walletProviderType === "browserExtension",
    );
    if (!hasInstalledExtension && !extrasBefore && !extrasAfter) {
      return "discovered";
    }
    return "installed";
  });
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // When set, render the QR/deeplink surface for the picked WC wallet
  // and listen for the account-changed event to know when the user
  // completes the handshake.
  const [wcConnect, setWcConnect] = useState<{
    uri: string;
    wallet: WalletConnectCatalogWallet;
    id: string;
  } | null>(null);

  const catalog = useWalletConnectCatalog({ enabled: view === "discovered" });
  const groups = groupProviders(providers);

  // Split groups by "is this an actually-installed browser extension"
  // — drives both the auto-jump heuristic above AND the discovered
  // view's pinned-row section (hosted providers like Coinbase Base
  // Account need to surface in discovered when there's no installed
  // list to fall back on).
  const extensionGroups = groups.filter((g) =>
    g.providers.some((p) => p.walletProviderType === "browserExtension"),
  );
  const hostedGroups = groups.filter((g) =>
    g.providers.every((p) => p.walletProviderType !== "browserExtension"),
  );

  // Collapse the (wallet × chain) catalog into per-vendor groups so
  // Phantom EVM / Phantom SOL / Phantom Bitcoin render as one row with
  // three chain badges instead of three duplicate rows. Filter
  // substring-matches the group name OR any wallet name inside the
  // group, so a search for "phantom solana" still surfaces the
  // Phantom group via its SOL variant.
  const catalogGroups = useMemo(
    () => buildCatalogGroups(catalog.catalog, { query }),
    [catalog.catalog, query],
  );

  async function connectInstalled(group: WalletGroup) {
    // Prefer the host's `preferredChain` (default EVM); fall back to
    // whatever chain the SDK ordered first.
    const provider =
      group.providers.find((p) => p.chain === preferredChain) ??
      group.providers[0];
    if (!provider) return;
    setConnecting(group.key);
    setError(null);
    try {
      // Use the WalletAccount returned by `connect()` directly rather
      // than polling `getPrimaryWalletAccount()` afterwards. In SDK
      // 1.3.0 the primary-account cache settles slightly after
      // `connect*` resolves; the synchronous read races and returns
      // null, which made `if (w) onConnected(w)` silently swallow
      // successful connects — manifesting as "click does nothing" in
      // the picker UI. The SDK demo's reference impl subscribes to
      // `walletAccountsChanged`; reading the return value is the
      // imperative equivalent.
      //
      // Branch the call instead of ternary-narrowing. The verify
      // variant is typed `Promise<SolanaWalletAccount>` in 1.3.0
      // (SDK typing bug — it actually resolves with any chain's
      // `WalletAccount`); cast its result through the parent union
      // so the rest of the function stays chain-agnostic.
      let w: WalletAccount | null | undefined;
      if (verifyOnConnect) {
        w = (await connectAndVerifyWithWalletProvider({
          walletProviderKey: provider.key,
        })) as WalletAccount;
      } else {
        w = await connectWithWalletProvider({
          walletProviderKey: provider.key,
        });
      }
      if (w) {
        onConnected(w);
      } else {
        // Defensive — shouldn't happen given the SDK contract, but if
        // the return is ever undefined we fall back to the primary
        // account so the picker still advances.
        const fallback = getPrimaryWalletAccount();
        if (fallback) onConnected(fallback);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setConnecting(null);
    }
  }

  // Snapshot the currently-connected wallet so we know which account is
  // "new" once the WC handshake settles — `walletAccountsChanged` fires
  // for every account change, not just connects.
  const priorWalletAddressRef = useRef<string | null>(null);

  async function connectDiscovered(group: CatalogGroup) {
    setConnecting(`wc:${group.id}`);
    setError(null);
    priorWalletAddressRef.current = getPrimaryWalletAccount()?.address ?? null;
    // A group can carry multiple chain variants (Phantom = EVM + SOL +
    // BTC, etc.). Route through the host's `preferredChain` when the
    // group supports it; otherwise fall back to the first chain we
    // have a working connect function for.
    const wallet = pickWalletForChain(group, preferredChain);
    try {
      // The SDK call resolves quickly with the WC connection URI; the
      // actual wallet connection happens out-of-band when the buyer
      // scans the QR or follows the deeplink. We then listen for the
      // account-changed event below to call onConnected.
      const wcConnectFn = pickWalletConnectFn(wallet.chain, verifyOnConnect);
      if (!wcConnectFn) {
        setError(`${wallet.chain} WalletConnect not supported yet.`);
        return;
      }
      const result = (await wcConnectFn()) as { uri?: string } | undefined;
      if (!result?.uri) {
        // No URI back — typically means the SDK pulled the buyer
        // through its own modal; check if a wallet showed up.
        const w = getPrimaryWalletAccount();
        if (w && w.address !== priorWalletAddressRef.current) {
          onConnected(w);
        }
        return;
      }
      setWcConnect({ uri: result.uri, wallet, id: group.id });
      // Best-effort deeplink for mobile clients — the wallet app
      // typically auto-opens with the URI appended.
      const deeplink =
        wallet.deeplinks?.native ?? wallet.deeplinks?.universal;
      if (deeplink && typeof window !== "undefined" && isMobileViewport()) {
        const sep = deeplink.includes("?") ? "&" : "?";
        window.location.href = `${deeplink}${sep}uri=${encodeURIComponent(
          result.uri,
        )}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setConnecting(null);
    }
  }

  // Listen for the account-changed event while the QR is up; fire
  // `onConnected` once a NEW wallet (different from the snapshot above)
  // appears.
  useEffect(() => {
    if (!wcConnect) return;
    const listener = () => {
      const w = getPrimaryWalletAccount();
      if (w && w.address !== priorWalletAddressRef.current) {
        setWcConnect(null);
        onConnected(w);
      }
    };
    onEvent({ event: "walletAccountsChanged", listener });
    return () => {
      offEvent({ event: "walletAccountsChanged", listener });
    };
  }, [wcConnect, onConnected]);

  const maxHeight =
    initialMoreWalletsShown * ROW_HEIGHT_PX +
    Math.max(0, initialMoreWalletsShown - 1) * ROW_GAP_PX;

  // Once the SDK hands us a WC URI, show the QR surface above
  // everything else — this is the only thing the buyer should be
  // interacting with until the handshake settles or they cancel.
  if (wcConnect) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <WalletConnectQrSurface
          uri={wcConnect.uri}
          wallet={wcConnect.wallet}
          onCancel={() => {
            setWcConnect(null);
            priorWalletAddressRef.current = null;
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Picker-level header — context like "Sign in / Connect to your
          platform wallet" applies in both views, not just installed. */}
      {header}

      {view === "installed" ? (
        <div className="flex flex-col gap-2">
          {extrasBefore}
          {groups.length === 0 && !extrasBefore && !extrasAfter ? (
            <p className="text-sm text-(--brand-fg-secondary)">
              No wallets detected. Open the picker below to connect from a
              mobile wallet, or install MetaMask / Phantom.
            </p>
          ) : (
            groups.map((g) => (
              <InstalledRow
                key={g.key}
                group={g}
                connecting={connecting === g.key}
                disabled={connecting !== null}
                onClick={() => void connectInstalled(g)}
              />
            ))
          )}
          {extrasAfter}

          <button
            type="button"
            onClick={() => setView("discovered")}
            className="mt-1 self-center cursor-pointer text-[13px] font-medium text-(--brand-muted) hover:text-(--brand-fg) transition-colors"
          >
            Show more wallets
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Hide the back link when the installed view has nothing
              real to return to — only an actually-installed extension
              (or host-provided extras) is worth navigating back for.
              Hosted providers like Base Account get pinned BELOW
              instead so the user doesn't lose access. */}
          {(extensionGroups.length > 0 ||
            !!extrasBefore ||
            !!extrasAfter) && (
            <button
              type="button"
              onClick={() => {
                setView("installed");
                setQuery("");
              }}
              disabled={connecting !== null}
              className="inline-flex items-center gap-1.5 self-start cursor-pointer text-[11px] font-medium text-(--brand-muted) hover:text-(--brand-fg) disabled:opacity-50 transition-colors"
            >
              <BackArrowGlyph />
              Back to installed wallets
            </button>
          )}

          {/* Search at the top so the primary affordance — type to
              find any wallet — is the first thing the user reaches
              for. Pinned hosted providers (Base Account etc.) sit
              between search and the catalog so they stay above the
              fold without taking the entry-point slot. */}
          <WalletSearchInput
            value={query}
            onChange={setQuery}
            disabled={catalog.loading || !!catalog.error || connecting !== null}
          />

          {/* Pinned hosted providers (Coinbase Base Account etc.) —
              only rendered when there's no installed view to fall
              back on. Unaffected by the search query so the user can
              always reach them. */}
          {extensionGroups.length === 0 && hostedGroups.length > 0 && (
            <div className="flex flex-col gap-2">
              {hostedGroups.map((g) => (
                <InstalledRow
                  key={g.key}
                  group={g}
                  connecting={connecting === g.key}
                  disabled={connecting !== null}
                  onClick={() => void connectInstalled(g)}
                />
              ))}
            </div>
          )}

          <DiscoveredList
            groups={catalog.catalog ? catalogGroups : null}
            loading={catalog.loading}
            error={catalog.error}
            query={query}
            connecting={connecting}
            disabled={connecting !== null}
            onSelect={(group) => void connectDiscovered(group)}
            maxHeight={maxHeight}
          />
        </div>
      )}

      {error && <p className="text-xs text-(--brand-error)">{error}</p>}
    </div>
  );
}

function InstalledRow({
  group,
  connecting,
  disabled,
  onClick,
}: {
  group: WalletGroup;
  connecting: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  // "Installed" only honestly applies when at least one provider in the
  // group is an EIP-6963 browser extension we actually detected. Hosted
  // providers like Coinbase Base Account (walletProviderType ===
  // "custodialService") show up unconditionally — they connect via a
  // popup at keys.coinbase.com, not via an installed extension, so the
  // "Installed" badge would be misleading.
  const isInstalledExtension = group.providers.some(
    (p) => p.walletProviderType === "browserExtension",
  );
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-between gap-3 rounded-xl bg-(--brand-row-bg) px-4 py-3 text-sm font-medium text-(--brand-fg) hover:bg-(--brand-row-hover) disabled:opacity-50 transition-colors [&_*]:pointer-events-none"
    >
      <span className="flex items-center gap-3">
        {group.icon && (
          <img
            src={group.icon}
            alt=""
            className="h-8 w-8 rounded-lg object-contain"
          />
        )}
        <span className="text-[15px]">{group.displayName}</span>
      </span>
      {(connecting || isInstalledExtension) && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brand-surface) border border-(--brand-border) px-2.5 py-1 text-[11px] font-medium text-(--brand-muted)">
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-(--brand-primary)"
          />
          {connecting ? "Connecting…" : "Installed"}
        </span>
      )}
    </button>
  );
}

/**
 * Search field above the discovered list. Auto-focuses when mounted so
 * the buyer can start typing immediately after clicking "Show more
 * wallets" — no extra click required.
 */
function WalletSearchInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <label
      className={cn(
        "flex items-center gap-2 rounded-xl bg-(--brand-row-bg) px-3 py-2.5",
        "focus-within:ring-2 focus-within:ring-(--brand-primary) focus-within:ring-offset-1 focus-within:ring-offset-(--brand-surface)",
        disabled && "opacity-60",
      )}
    >
      <SearchGlyph />
      <input
        ref={ref}
        type="search"
        autoComplete="off"
        spellCheck={false}
        placeholder="Search wallets"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        // Suppress the browser-native search clear button (the dark X
        // that WebKit/Blink + Edge inject for `type="search"`). We
        // render our own gray ClearGlyph below, and having both
        // creates a double-X.
        // 16px floor on font-size — iOS Safari auto-zooms any focused
        // input whose computed font-size is below 16px. Keeping pinch-
        // zoom intact (we do NOT disable user-scalable globally — that
        // breaks WCAG 1.4.4 / 2.5.5) means each input has to clear the
        // threshold on its own.
        className="flex-1 bg-transparent text-[16px] text-(--brand-fg) placeholder:text-(--brand-muted) outline-none disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-ms-clear]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="shrink-0 cursor-pointer text-(--brand-muted) hover:text-(--brand-fg) transition-colors"
        >
          <ClearGlyph />
        </button>
      )}
    </label>
  );
}

function DiscoveredList({
  groups,
  loading,
  error,
  query,
  connecting,
  disabled,
  onSelect,
  maxHeight,
}: {
  /** Null while the catalog fetch is in-flight; empty array means filtered to zero. */
  groups: CatalogGroup[] | null;
  loading: boolean;
  error: string | null;
  query: string;
  connecting: string | null;
  disabled: boolean;
  onSelect: (group: CatalogGroup) => void;
  maxHeight: number;
}) {
  if (loading || groups === null) {
    return (
      <p className="text-sm text-(--brand-fg-secondary) px-1 py-2">
        Loading wallets…
      </p>
    );
  }
  if (error) {
    return <p className="text-sm text-(--brand-error) px-1 py-2">{error}</p>;
  }
  if (groups.length === 0) {
    return (
      <p className="text-sm text-(--brand-fg-secondary) px-1 py-2">
        {query.trim()
          ? `No wallets match “${query.trim()}”.`
          : "No additional wallets available right now."}
      </p>
    );
  }
  return (
    <div
      className="flex flex-col gap-2 overflow-y-auto pr-1"
      style={{ maxHeight: `${maxHeight}px` }}
    >
      {groups.map((group) => {
        // Dedupe chain badges within a group — a vendor that lists
        // (EVM mobile, EVM extension) shouldn't render two EVM chips.
        const chains = Array.from(
          new Set(group.wallets.map((w) => w.chain)),
        );
        const isConnecting = connecting === `wc:${group.id}`;
        return (
          <button
            key={group.id}
            type="button"
            onClick={() => onSelect(group)}
            disabled={disabled}
            className="flex items-center justify-between gap-3 rounded-xl bg-(--brand-row-bg) px-4 py-3 text-sm font-medium text-(--brand-fg) hover:bg-(--brand-row-hover) disabled:opacity-50 transition-colors [&_*]:pointer-events-none"
          >
            <span className="flex items-center gap-3 min-w-0">
              {group.spriteUrl && (
                <img
                  src={group.spriteUrl}
                  alt=""
                  className="h-8 w-8 rounded-lg object-contain bg-(--brand-surface)"
                />
              )}
              <span className="text-[15px] truncate">
                {isConnecting ? "Connecting…" : group.name}
              </span>
            </span>
            {chains.length > 0 && !isConnecting && (
              <span className="inline-flex items-center gap-1 shrink-0">
                {chains.map((chain) => (
                  <span
                    key={chain}
                    className="inline-flex items-center rounded-full bg-(--brand-surface) border border-(--brand-border) px-2 py-0.5 text-[10px] font-medium text-(--brand-muted) uppercase tracking-wide"
                  >
                    {chain}
                  </span>
                ))}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function WalletConnectQrSurface({
  uri,
  wallet,
  onCancel,
}: {
  uri: string;
  wallet: WalletConnectCatalogWallet;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 self-start cursor-pointer text-[11px] font-medium text-(--brand-muted) hover:text-(--brand-fg) transition-colors"
      >
        <BackArrowGlyph />
        Back to wallets
      </button>

      <div className="flex flex-col items-center gap-3 rounded-2xl bg-(--brand-row-bg) px-5 py-6">
        <div className="flex items-center gap-2.5">
          {wallet.spriteUrl && (
            <img
              src={wallet.spriteUrl}
              alt=""
              className="h-7 w-7 rounded-lg object-contain bg-(--brand-surface)"
            />
          )}
          <span className="text-[15px] font-semibold text-(--brand-fg)">
            {wallet.name}
          </span>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <QRCodeSVG
            value={uri}
            size={208}
            level="M"
            marginSize={0}
            bgColor="#ffffff"
            fgColor="#0E121B"
          />
        </div>

        <p className="text-[13px] text-(--brand-fg-secondary) text-center max-w-[28ch]">
          Open {wallet.name} on your phone and scan the QR code, or tap a
          deeplink if your wallet is installed on this device.
        </p>
      </div>
    </div>
  );
}

/**
 * Coarse mobile-viewport heuristic. Used to decide whether to attempt
 * an automatic deeplink to the wallet's native app — desktops should
 * stay on the QR view and let the buyer scan from their phone.
 */
function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 640px)").matches;
}

/**
 * Map a WalletConnect catalog entry's chain to the matching SDK
 * connect function. `null` for chains we don't support yet — callers
 * surface that as a user-facing error rather than routing through the
 * wrong namespace.
 *
 * Host apps must register the matching extension on their Dynamic
 * client (`addWalletConnectEvmExtension`, `addWalletConnectSolanaExtension`).
 */
type WalletConnectConnectFn = () => Promise<{ uri?: string } | unknown>;

function pickWalletConnectFn(
  chain: string,
  verifyOnConnect: boolean,
): WalletConnectConnectFn | null {
  if (chain === "EVM") {
    return verifyOnConnect
      ? (connectAndVerifyWithWalletConnectEvm as WalletConnectConnectFn)
      : (connectWithWalletConnectEvm as WalletConnectConnectFn);
  }
  if (chain === "SOL") {
    return verifyOnConnect
      ? (connectAndVerifyWithWalletConnectSolana as WalletConnectConnectFn)
      : (connectWithWalletConnectSolana as WalletConnectConnectFn);
  }
  return null;
}

function BackArrowGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="block"
    >
      <path
        d="M11 7H1m0 0l4-4M1 7l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="block shrink-0 text-(--brand-muted)"
    >
      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9.5 9.5L12 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClearGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="block"
    >
      <path
        d="M3.5 3.5l7 7M10.5 3.5l-7 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
