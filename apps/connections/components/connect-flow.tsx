"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  useInitStatus,
  useGetWalletOptionsCatalogue,
  useConnectWithWalletProvider,
  useLogout,
  useOnEvent,
  useOnWalletProviderEvent,
} from "@dynamic-labs-sdk/react-hooks";
import {
  getInstallationLinkForCurrentPlatform,
  isMobile,
} from "@dynamic-labs-sdk/client";
import { clearMetaMaskSessionStorage } from "@dynamic-labs-sdk/metamask";

import { getDynamicEnvironmentId } from "@/lib/config";
import { buildOpenableDeeplink, mintConnection } from "@/lib/connect-engine";
import {
  buildRedirectUrl,
  chainMeta,
  detectAddressChain,
  getIncomingNonce,
  getRedirectScheme,
  isTronAddress,
  normalizeChain,
  redirectToCallback,
  type ConnectedWallet,
} from "@/lib/redirect";
import { getEnvInfo } from "@/lib/runtime-env";
import {
  featuredOptions,
  hasInstalledExtension,
  installedConnectors,
  sortedOptions,
  type Connector,
  type WalletConnectionOption,
  type WalletOption,
} from "@/lib/wallet-providers";
import {
  Button,
  ErrorBanner,
  Input,
  ListRow,
  Spinner,
} from "@dynamic-demos/ui";
import { useTrack } from "@dynamic-demos/analytics";

import { ChainIcon } from "./chain-icon";
import { ChevronLeft, RowChevron } from "./icons";
import { ConnectSkeletonBody } from "./connect-skeleton";
import { Disclosure } from "./disclosure";
import { DebugPanel } from "./debug-panel";
// Marks that we kicked off a redirect-style connect (e.g. Phantom's deep-link
// protocol) that navigates away. On return we complete ONLY when this is set,
// so a leftover session can never auto-redirect the user.
const PENDING_REDIRECT_KEY = "fbwc_pending_redirect";

// Generic "WalletConnect" entry - mints a chain-agnostic WC session (QR on
// desktop, wallet chooser on mobile). Injected into the list so users can
// connect any WalletConnect-compatible wallet.
const WALLETCONNECT_ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="#3396FF"/><path fill="#fff" d="M12.4 15.6c4.2-4.1 11-4.1 15.2 0l.5.5c.2.2.2.5 0 .7l-1.7 1.7c-.1.1-.3.1-.4 0l-.7-.7c-2.9-2.9-7.7-2.9-10.6 0l-.8.7c-.1.1-.3.1-.4 0L11.8 17c-.2-.2-.2-.5 0-.7l.6-.7zm18.8 3.5 1.5 1.5c.2.2.2.5 0 .7l-6.9 6.8c-.2.2-.5.2-.7 0l-4.9-4.8c0-.1-.1-.1-.2 0l-4.9 4.8c-.2.2-.5.2-.7 0l-7-6.8c-.2-.2-.2-.5 0-.7l1.5-1.5c.2-.2.5-.2.7 0l4.9 4.8c0 .1.1.1.2 0l4.9-4.8c.2-.2.5-.2.7 0l4.9 4.8c0 .1.1.1.2 0l4.9-4.8c.3-.2.6-.2.8 0z"/></svg>',
  );

const WALLETCONNECT_OPTION: WalletOption = {
  key: "walletconnect",
  name: "WalletConnect",
  iconUrl: WALLETCONNECT_ICON,
  connectionOptions: [{ type: "walletConnect", chain: "EVM" }],
};

function shortAddress(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

// The install link for the current platform (App Store on iOS, Play Store on
// Android, the right extension store on desktop), or undefined if none.
function installLinkFor(option: WalletOption): string | undefined {
  const urls = option.installationUrls;
  return urls ? getInstallationLinkForCurrentPlatform({ installationUrls: urls }) : undefined;
}

// After a wallet redirects back (e.g. Phantom appends its encrypted response to
// the URL), strip everything except our own params. Otherwise navigating back
// to this page re-runs the redirect extension against stale params and can
// re-open the wallet.
function cleanRedirectParamsFromUrl() {
  try {
    const url = new URL(window.location.href);
    const keep = new URLSearchParams();
    for (const key of ["redirect_uri", "redirect_url", "nonce"]) {
      const value = url.searchParams.get(key);
      if (value) keep.set(key, value);
    }
    const query = keep.toString();
    window.history.replaceState(null, "", url.pathname + (query ? `?${query}` : ""));
  } catch {
    /* ignore */
  }
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Search box. `Input` from @dynamic-demos/ui owns the field itself; the leading
 * icon and the Clear affordance are positioned over it, since the shared
 * component has no slots for either.
 *
 * Only padding and radius are overridden - the padding clears the two overlaid
 * controls, and the radius matches ListRow's `--widget-radius` so the field and
 * the wallet rows below it share one geometry. Height and type size stay on the
 * shared defaults; upstream's taller 16px field made this read as a different
 * control from every other search box in the monorepo. The iOS zoom-on-focus
 * that 16px was guarding against is handled globally in globals.css instead.
 */
function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative mt-[18px] mb-3.5">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-(--brand-muted)"
      >
        <SearchIcon />
      </span>
      <Input
        type="search"
        placeholder="Search for your wallet"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search for a wallet"
        className="border-transparent bg-(--brand-row-bg) rounded-[var(--widget-radius,10px)] pl-10 pr-16"
      />
      {value && (
        <button
          type="button"
          className="search-field__clear absolute right-2.5 top-1/2 -translate-y-1/2"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          Clear
        </button>
      )}
    </div>
  );
}

/**
 * Back control, flush against the card's top-left gutter.
 *
 * Styling follows apps/flow's own back affordance: muted, brightening to
 * `--brand-fg` on hover, with the chevron easing left. Not underline-on-hover,
 * which is for inline prose links, and not `--brand-fg-secondary`, which isn't
 * part of the palette the other demos use for this. The slide direction mirrors
 * apps/trade's `group-hover:translate-x-1` on its forward arrows.
 *
 * The geometry took undoing two defaults. The shared Button's size is
 * `h-9 px-4 py-2`, which centres the label in a fixed 36px box and so floated it
 * ~13px below the card's padding - `h-auto` plus upstream's own `2px 0 12px`
 * puts it back on the top edge. And the glyph is an SVG rather than a text "‹"
 * because a chevron character carries a side bearing wide enough to read as a
 * left indent; an SVG box starts exactly on the gutter.
 *
 * One component for all four screens that need it - the above is fiddly enough
 * that four copies would drift.
 */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="link"
      onClick={onClick}
      className="group h-auto gap-1.5 self-start px-0 pt-0.5 pb-3 text-[13px] font-medium text-(--brand-muted) no-underline transition-colors hover:text-(--brand-fg) hover:no-underline"
    >
      <span className="transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
        <ChevronLeft />
      </span>
      Back
    </Button>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Pull a human-readable string out of whatever a connector throws - some throw
// Error instances, others plain objects (which would stringify to
// "[object Object]"). Returns "" when nothing usable is found.
function extractMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const nested =
      o.error && typeof o.error === "object"
        ? (o.error as Record<string, unknown>).message
        : o.error;
    const candidate = o.shortMessage ?? o.message ?? o.reason ?? nested ?? o.name;
    if (typeof candidate === "string") return candidate;
  }
  return "";
}

function isRejection(e: unknown, msg: string): boolean {
  const code = e && typeof e === "object" ? (e as Record<string, unknown>).code : undefined;
  if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") return true;
  return /reject|denied|declined|cancel|closed|dismiss/i.test(msg);
}

// Turn raw connect errors into something a user can act on.
function friendlyError(e: unknown, fallback: string): string {
  const msg = extractMessage(e);
  if (isRejection(e, msg)) {
    return "The connection request was cancelled. Please try again.";
  }
  // MetaMask (and others) reject a second request while one is still open.
  if (/already pending|already processing|-32002/i.test(msg)) {
    return "There's already a request open in your wallet - approve or close it, then try again.";
  }
  return msg || fallback;
}

function WalletImg({ src, name, size }: { src?: string; name: string; size: number }) {
  return (
    <span className="tile__icon" aria-hidden="true">
      {src ? (
        <img src={src} alt="" width={size} height={size} loading="lazy" />
      ) : (
        <span className="tile__placeholder" style={{ width: size, height: size }}>
          {name.charAt(0)}
        </span>
      )}
    </span>
  );
}

function WalletTile({
  option,
  connecting,
  disabled,
  onSelect,
}: {
  option: WalletOption;
  connecting: boolean;
  disabled: boolean;
  onSelect: (w: WalletOption) => void;
}) {
  const multiChain = installedConnectors(option).length > 1;
  // Shows the "Installed" tag whenever a real injected/extension wallet is
  // detected. Deep-link providers (Phantom's redirect) are excluded, so this
  // no longer false-positives on mobile.
  const installedExt = hasInstalledExtension(option);

  return (
    <ListRow
      label={option.name}
      // Let ListRow render the icon (it handles the <img> + onError fallback);
      // only supply a node for wallets with no icon, to keep upstream's
      // first-letter placeholder over the shared grey gradient.
      iconUrl={option.iconUrl}
      icon={
        option.iconUrl ? undefined : (
          <span className="tile__placeholder h-full w-full">
            {option.name.charAt(0)}
          </span>
        )
      }
      iconSize="lg"
      onClick={() => onSelect(option)}
      disabled={disabled}
      isLoading={connecting}
      loadingText="Connecting..."
      aria-label={`Connect ${option.name}`}
      // `group` so the chevron can reveal on row hover. The size overrides drop
      // ListRow's fixed 46px height in favour of `InstalledRow`'s content-driven
      // one from packages/checkouts-widget - 32px icon (`iconSize="lg"`) plus
      // 12/16 padding, so this list measures the same as every other demo's.
      // className merges last through twMerge, so these win.
      className="group h-auto gap-3 rounded-(--brand-radius) px-4 py-3"
      rightContent={
        <>
          {installedExt && (
            <span className="pill">
              <span className="pill__dot" aria-hidden="true" />
              Installed
            </span>
          )}
          {multiChain && <RowChevron />}
        </>
      }
    />
  );
}

export function ConnectFlow() {
  const { data: initStatus } = useInitStatus();
  const {
    data: options = [],
    isLoading: catalogueLoading,
    refetch: refetchCatalogue,
  } = useGetWalletOptionsCatalogue({ includeMobileOptions: true }) as {
    data?: WalletOption[];
    isLoading?: boolean;
    refetch?: () => void;
  };
  const { mutateAsync: connectWallet } = useConnectWithWalletProvider();
  const { mutateAsync: logout } = useLogout();
  // Funnel events. No-ops with NEXT_PUBLIC_TRACK_URL unset, so no guards needed.
  // Names come from CONNECT_MILESTONES - see lib/analytics/milestones.ts.
  const { milestone } = useTrack();

  // The developer integration guide used to be an in-place `#developers` view;
  // it now lives in the scenario page's side panel, so this only toggles the
  // manual-entry screen.
  const [view, setView] = useState<"home" | "manual">("home");
  const [search, setSearch] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [pending, setPending] = useState<WalletOption | null>(null);
  const [connectingKey, setConnectingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<ConnectedWallet | null>(null);
  // Which provider the connected wallet came from. Kept out of ConnectedWallet -
  // that type is the outgoing redirect payload and should carry only the
  // documented params. This is here to subscribe to that one provider's
  // `accountsChanged`; null for a manually pasted address (no provider).
  const [connectedProviderKey, setConnectedProviderKey] = useState<string | null>(null);
  // Hand-off in flight. The redirect is a full document navigation - on a slow
  // network the page can sit on the confirmation screen for a beat after the tap,
  // which reads as the button not working and invites a second tap.
  const [handingOff, setHandingOff] = useState(false);
  const [wc, setWc] = useState<
    | { status: "preparing"; option: WalletOption; opt: WalletConnectionOption }
    | {
        status: "ready" | "connecting";
        option: WalletOption;
        opt: WalletConnectionOption;
        deeplink?: string;
        inAppUrl?: string;
      }
    | { status: "qr"; option: WalletOption; opt: WalletConnectionOption; uri: string }
    | { status: "error"; option: WalletOption; opt: WalletConnectionOption; message: string }
    | null
  >(null);
  const [unavailable, setUnavailable] = useState<{
    option: WalletOption;
    installUrl?: string;
  } | null>(null);
  // Monotonic id for WalletConnect attempts. Starting a new attempt or
  // cancelling bumps it, so a superseded attempt's async continuation is
  // ignored (prevents an abandoned attempt from clobbering a newer one).
  const wcAttemptId = useRef(0);
  // Synchronous guard so a rapid double-tap can't fire two connect requests
  // (which makes wallets throw "request already pending").
  const connectingRef = useRef(false);

  const nonce = useMemo(() => getIncomingNonce(), []);
  // Optional deep-link target: `?wallet=<key>` routes straight into that
  // wallet's connect flow (skipping the picker); `?chain=evm|solana` preselects
  // a chain. Used by the native headless fallback to open the visible flow
  // straight on the tapped wallet. Unknown key falls open to the list.
  const deeplinkTarget = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    const wallet = (p.get("wallet") ?? "").trim();
    const chainRaw = p.get("chain");
    const chain =
      chainRaw && /^(evm|sol|solana|svm)$/i.test(chainRaw)
        ? normalizeChain(chainRaw)
        : undefined;
    return { wallet: wallet || null, chain };
  }, []);
  const autoSelectedRef = useRef(false);
  const allOptions = useMemo(() => {
    // Drop any WalletConnect entry the catalogue already includes, then prepend
    // our generic one (guaranteed QR/deep-link behavior + on-brand icon).
    const withoutWc = options.filter(
      (w) =>
        w.key.toLowerCase() !== "walletconnect" &&
        w.name.toLowerCase() !== "walletconnect",
    );
    return [WALLETCONNECT_OPTION, ...withoutWc];
  }, [options]);
  const featured = useMemo(() => featuredOptions(allOptions), [allOptions]);
  const list = useMemo(() => sortedOptions(allOptions, search), [allOptions, search]);

  // Diagnostic: load the page with `?debug` to log each featured wallet's
  // connection options + whether we consider it installed.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    console.log(
      "[wallet-debug]",
      featured.map((w) => ({
        name: w.name,
        key: w.key,
        installed: hasInstalledExtension(w),
        conns: (w.connectionOptions ?? []).map(
          (o) => `${o.type}:${o.source ?? "-"}:${o.walletProviderKey ?? "-"}`,
        ),
      })),
    );
  }, [featured]);

  // `?debug` shows an on-screen environment readout (see DebugPanel) - handy on
  // a real device inside a web view where a console isn't available.
  const debug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("debug");

  // Browser extensions announce themselves (EIP-6963) a moment after load, so
  // the initial catalogue can miss them. Re-fetch when providers change so a
  // freshly-detected extension (e.g. MetaMask) gets its "Installed" tag and
  // sorts to the top.
  useOnEvent({
    event: "walletProviderChanged",
    listener: () => {
      void refetchCatalogue?.();
    },
  });

  // Complete a redirect-style connection (Phantom deep-link) after the wallet
  // sends the user back. Gated on PENDING_REDIRECT_KEY so it only fires for a
  // connect WE initiated - never for a stale/leftover session.
  useOnEvent({
    event: "walletAccountsChanged",
    listener: (accounts: unknown) => {
      const raw = sessionStorage.getItem(PENDING_REDIRECT_KEY);
      if (!raw) return;
      const account = Array.isArray(accounts) ? accounts[0] : undefined;
      if (!account?.address) return;
      sessionStorage.removeItem(PENDING_REDIRECT_KEY);
      // Strip the wallet's redirect params so going back here won't re-trigger.
      cleanRedirectParamsFromUrl();
      let meta = { walletName: "Wallet", walletImage: "" };
      try {
        const parsed = JSON.parse(raw);
        meta = {
          walletName: parsed.walletName || "Wallet",
          walletImage: parsed.walletImage || "",
        };
      } catch {
        /* use defaults */
      }
      setConnected({
        address: account.address,
        chain: normalizeChain(account.chain),
        walletName: meta.walletName,
        walletImage: meta.walletImage,
      });
    },
  });

  // Track the account the user has selected inside their wallet.
  //
  // Dynamic has no "switch account" prompt to open, and by design a provider can
  // only have one account connected at a time (connecting MetaMask account 2
  // replaces account 1 rather than adding it). What it does give us is the
  // provider's own `accountsChanged`, so switching accounts in the extension is
  // reflected here immediately and the confirmation screen always shows the
  // address we would actually hand back.
  //
  // The hook no-ops while `walletProviderKey` is undefined, so it can be called
  // unconditionally - before a connection, and for a pasted address.
  useOnWalletProviderEvent({
    walletProviderKey: connectedProviderKey ?? undefined,
    event: "accountsChanged",
    callback: ({ addresses }) => {
      const next = addresses[0];
      // An empty array means the user disconnected us in the wallet, not that
      // they switched - send them back to the picker rather than showing a
      // confirmation for an account we no longer have.
      if (!next) {
        reset();
        return;
      }
      setConnected((prev) =>
        !prev || prev.address.toLowerCase() === next.toLowerCase()
          ? prev
          : { ...prev, address: next },
      );
    },
  });

  // Deep-link straight into a specified wallet once the catalogue is ready.
  // Runs once, only from the untouched initial home state.
  useEffect(() => {
    if (autoSelectedRef.current || !deeplinkTarget.wallet) return;
    if (initStatus !== "finished" || catalogueLoading || !allOptions.length) return;
    if (view !== "home" || wc || pending || unavailable || connected) return;
    if (sessionStorage.getItem(PENDING_REDIRECT_KEY)) return;
    autoSelectedRef.current = true;
    const target = deeplinkTarget.wallet.toLowerCase();
    const match =
      allOptions.find((w) => w.key.toLowerCase() === target) ??
      allOptions.find((w) => w.name.toLowerCase() === target);
    if (match) handleSelect(match, deeplinkTarget.chain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initStatus, catalogueLoading, allOptions, deeplinkTarget, view, wc, pending, unavailable, connected]);

  function handleSelect(option: WalletOption, preferredChain?: "evm" | "solana") {
    if (connectingKey || wc) return;
    setError(null);
    milestone("wallet_selected", { wallet: option.name });
    const connectors = installedConnectors(option);
    if (connectors.length > 1) {
      // Multi-chain: if a chain was preselected and this wallet has a connector
      // for it, go straight in; otherwise show the chain picker.
      if (preferredChain) {
        const match = connectors.find((c) => normalizeChain(c.chain) === preferredChain);
        if (match) {
          void connect(match, option);
          return;
        }
      }
      setPending(option);
      return;
    }
    const only = connectors[0];
    if (connectors.length === 1 && only) {
      void connect(only, option);
      return;
    }
    // Not installed. On mobile we present explicit "open" buttons (a tap is a
    // fresh user gesture, so the wallet opens synchronously - no async-redirect
    // warning). On desktop we show a QR to scan. When a chain was preselected,
    // restrict to that chain's connection options.
    const all = option.connectionOptions ?? [];
    const chainOpts = preferredChain
      ? all.filter((o) => normalizeChain(o.chain) === preferredChain)
      : all;
    const opts = chainOpts.length ? chainOpts : all;
    // Prefer MetaMask's own SDK URI when the catalogue offers it (MetaMask only)
    // so it shows a native MetaMask QR / deep link rather than a WalletConnect
    // one; fall back to WalletConnect for every other wallet.
    const deeplinkOpt =
      opts.find((o) => o.type === "metamaskSdkUri") ??
      opts.find((o) => o.type === "walletConnect");
    const iabOpt = opts.find((o) => o.type === "inAppBrowser");

    if (isMobile()) {
      if (deeplinkOpt) {
        void startWalletConnect(option, deeplinkOpt, iabOpt);
      } else if (iabOpt?.url) {
        setWc({ status: "ready", option, opt: iabOpt, inAppUrl: iabOpt.url });
      } else {
        handleNotInstalled(option);
      }
      return;
    }

    // Desktop: show a QR for any URI provider (WalletConnect, or MetaMask's own
    // SDK URI when its extension isn't installed); otherwise prompt to install.
    if (deeplinkOpt) {
      void startWalletConnect(option, deeplinkOpt);
      return;
    }
    handleNotInstalled(option);
  }

  async function startWalletConnect(
    option: WalletOption,
    opt: WalletConnectionOption,
    iabOpt?: WalletConnectionOption,
  ) {
    const chain = normalizeChain(opt.chain);
    const myId = ++wcAttemptId.current;
    const superseded = () => wcAttemptId.current !== myId;
    setError(null);
    setWc({ status: "preparing", option, opt });
    try {
      // Clear MetaMask's session storage (fast, skips its ~10s resume). Do NOT
      // await a full logout here - that can hang on mobile and get the flow
      // stuck on "Preparing". Session teardown happens on cancel/error instead.
      try {
        await clearMetaMaskSessionStorage();
      } catch {
        /* best effort */
      }
      if (superseded()) return;

      const { uri, approval } = await mintConnection(opt);
      if (superseded()) return;

      if (isMobile()) {
        // Prepare the deep link now; the actual open happens on the user's tap
        // (a fresh gesture), so the browser doesn't flag an async redirect.
        // buildOpenableDeeplink picks native-vs-universal based on the embedded
        // context (see connectEngine.ts).
        const embedded = getEnvInfo().isWebView;
        const deeplink = buildOpenableDeeplink(uri, opt, embedded);
        // In an embedded web view the host opens custom schemes for us without
        // needing a user gesture, so skip the extra "Open <wallet>" tap and
        // launch straight away. (In a normal mobile browser an auto-open after
        // the async mint isn't a trusted gesture and gets blocked, so there we
        // keep the explicit tap.) The connecting screen still offers a "Reopen"
        // button as a fallback.
        if (embedded && deeplink) {
          setWc({ status: "connecting", option, opt, deeplink, inAppUrl: iabOpt?.url });
          window.location.href = deeplink;
        } else {
          setWc({ status: "ready", option, opt, deeplink, inAppUrl: iabOpt?.url });
        }
      } else {
        setWc({ status: "qr", option, opt, uri });
      }

      const { walletAccounts } = await approval();
      if (superseded()) return;
      const account = walletAccounts[0];
      if (account) {
        setConnected({
          address: account.address,
          chain,
          walletName: option.name,
          walletImage: option.iconUrl ?? "",
        });
      }
      setWc(null);
    } catch (e) {
      if (superseded()) return;
      setWc({
        status: "error",
        option,
        opt,
        message: friendlyError(e, "Couldn't complete the connection."),
      });
      // Drop the failed session so "Try again" starts clean.
      void clearStaleSessions();
    }
  }

  // Deep-link opens are rendered as real <a> taps rather than programmatic
  // navigation: inside a WKWebView, iOS ignores universal links opened via
  // `location.href` (it treats them as an untrusted event) but honours a genuine
  // anchor tap. This just flips the UI to "connecting"; the anchor's href does
  // the actual open.
  function markConnecting() {
    setWc((prev) => (prev ? { ...prev, status: "connecting" } : prev));
  }

  // The in-app-browser URL is a template with `{{encodedDappURI}}`; resolve it
  // to a real href so it can back an <a> tap. Some wallets (e.g. Phantom) use the
  // placeholder more than once, so replace every occurrence, not just the first.
  function inAppHref(urlTemplate: string): string {
    return urlTemplate.replaceAll(
      "{{encodedDappURI}}",
      encodeURIComponent(window.location.href),
    );
  }

  // Tear down any half-open session so the wallet doesn't keep a stale pairing
  // (which is what forces users to disconnect in the wallet before retrying).
  async function clearStaleSessions() {
    try {
      await clearMetaMaskSessionStorage();
    } catch {
      /* best effort */
    }
    try {
      await logout();
    } catch {
      /* best effort */
    }
  }

  function cancelWalletConnect() {
    wcAttemptId.current++;
    setWc(null);
    setError(null);
    void clearStaleSessions();
  }

  // No live connection on this device (e.g. Phantom on desktop, no QR).
  // Guide the user to install it or switch to mobile.
  function handleNotInstalled(option: WalletOption) {
    const urls = option.installationUrls;
    const installUrl = urls
      ? getInstallationLinkForCurrentPlatform({ installationUrls: urls })
      : undefined;
    setUnavailable({ option, installUrl });
  }

  async function connect(connector: Connector, option: WalletOption) {
    if (connectingKey || connectingRef.current) return;
    connectingRef.current = true;
    setError(null);
    setConnectingKey(connector.walletProviderKey);
    // On mobile, some connectors (e.g. Phantom's deep-link redirect) navigate
    // away and the page reloads on return, so this promise won't resolve. Mark
    // the pending connect so the return handler can complete it.
    if (isMobile()) {
      sessionStorage.setItem(
        PENDING_REDIRECT_KEY,
        JSON.stringify({ walletName: option.name, walletImage: option.iconUrl ?? "" }),
      );
    }
    try {
      const account = await connectWallet({ walletProviderKey: connector.walletProviderKey });
      sessionStorage.removeItem(PENDING_REDIRECT_KEY);
      setConnected({
        address: account.address,
        chain: connector.chain,
        walletName: option.name,
        walletImage: option.iconUrl ?? "",
      });
      // Registered provider - we can follow account switches made in the wallet.
      setConnectedProviderKey(connector.walletProviderKey);
      milestone("wallet_connected", {
        wallet: option.name,
        chain: connector.chain,
      });
      setPending(null);
      setConnectingKey(null);
    } catch (e) {
      sessionStorage.removeItem(PENDING_REDIRECT_KEY);
      setError(friendlyError(e, "Could not connect to that wallet."));
      setConnectingKey(null);
      milestone("connect_failed", { wallet: option.name });
      void clearStaleSessions();
    } finally {
      connectingRef.current = false;
    }
  }

  function submitManual() {
    const chain = detectAddressChain(manualAddress);
    if (!chain) return;
    milestone("manual_address_submitted", { chain });
    // A pasted address has no provider behind it, so nothing to subscribe to.
    setConnectedProviderKey(null);
    setConnected({
      address: manualAddress.trim(),
      chain,
      walletName: "Wallet address",
      walletImage: "",
    });
  }

  function reset() {
    wcAttemptId.current++;
    sessionStorage.removeItem(PENDING_REDIRECT_KEY);
    setWc(null);
    setUnavailable(null);
    setConnected(null);
    setConnectedProviderKey(null);
    setHandingOff(false);
    setPending(null);
    setError(null);
    setView("home");
    setManualAddress("");
    setSearch("");
  }

  // Renders to end users, not just us - keep it short, details in the README.
  if (!getDynamicEnvironmentId()) {
    return (
      <div className="page">
        <main className="card">
          <ErrorBanner
            type="warning"
            title="Missing configuration"
            message="No Dynamic environment id is configured, so the wallet list cannot load. Set NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID for this deployment - see the README for setup."
          />
        </main>
      </div>
    );
  }

  // Connected - show the wallet, then count down and redirect back.
  if (connected) {
    // The hand-off is confirmed, never automatic: the user gets to check which
    // account came back (wallets can be connected to several) and swap wallets
    // before anything is sent on. A custom app scheme additionally REQUIRES a
    // real <a> tap - a host web view may ignore programmatic navigation to it -
    // so that case renders an anchor rather than a Button.
    const returnScheme = getRedirectScheme();
    const isCustomReturn = returnScheme !== "https" && returnScheme !== "http";
    // No address here - the redirect params are the integrator's business, and a
    // public address is still an identifier we have no reason to put in
    // analytics. Scheme and chain are what tell us how the hand-off was used.
    const handoffProps = {
      wallet: connected.walletName,
      chain: connected.chain,
      returnScheme,
    };
    return (
      <div className="page">
        <main className="card" key="connected">
          <div className="success-header">
            <span className="success-header__icon" aria-hidden="true">
              {/* 13 in a 24px circle - same glyph-to-circle ratio as the row's
                  check (14 in 26). At 24 it ran edge to edge. */}
              <CheckIcon size={13} />
            </span>
            <h1 className="card__title">Wallet connected</h1>
          </div>

          <div className="tile tile--static">
            <WalletImg src={connected.walletImage} name={connected.walletName} size={32} />
            <span className="tile__label">
              <span className="tile__name">{connected.walletName}</span>
              <span className="tile__sub">
                {chainMeta(connected.chain).title} · {shortAddress(connected.address)}
              </span>
            </span>
            <span className="tile__check" aria-hidden="true">
              <CheckIcon size={14} />
            </span>
          </div>

          <p className="card__subtitle card__subtitle--after">
            {connectedProviderKey
              ? `Check this is the account you want to hand back. To use a different one, switch accounts in ${connected.walletName} and it will update here.`
              : "Check this is the account you want to hand back, then continue."}
          </p>

          {isCustomReturn ? (
            <a
              className="btn-primary btn-primary--block"
              href={buildRedirectUrl(connected, nonce)}
              onClick={() => {
                milestone("handoff_confirmed", handoffProps);
                setHandingOff(true);
              }}
              aria-busy={handingOff}
            >
              {handingOff ? "Returning…" : "Return to the app"}
            </a>
          ) : (
            <Button
              loading={handingOff}
              onClick={() => {
                milestone("handoff_confirmed", handoffProps);
                setHandingOff(true);
                redirectToCallback(connected, nonce);
              }}
              className="mt-4 h-12 w-full text-base"
            >
              Continue
            </Button>
          )}

          <Button
            variant="link"
            onClick={reset}
            disabled={handingOff}
            className="mt-3 w-full text-sm"
          >
            Use a different wallet
          </Button>
        </main>
        <Disclosure />
        {debug && <DebugPanel />}
      </div>
    );
  }

  // WalletConnect (non-installed wallet): QR on desktop, deep link on mobile.
  if (wc) {
    const name = wc.option.name;
    const inAppOnly =
      wc.status === "ready" && !wc.deeplink && !!wc.inAppUrl;
    const title =
      wc.status === "error"
        ? `Couldn't connect ${name}`
        : wc.status === "qr"
          ? `Scan with ${name}`
          : wc.status === "connecting"
            ? `Waiting for ${name}`
            : `Open ${name}`;
    const subtitle =
      wc.status === "error"
        ? "The connection didn't go through."
        : wc.status === "qr"
          ? "Open your wallet app and scan this code to connect."
          : wc.status === "connecting"
            ? `Approve the request in ${name}, then you'll come back here.`
            : wc.status === "preparing"
              ? "Preparing a secure connection…"
              : inAppOnly
                ? `Continue inside ${name}'s browser to connect.`
                : "Open the app to approve - you'll return here automatically.";
    return (
      <div className="page">
        <main className="card" key="wc">
          <BackButton onClick={cancelWalletConnect} />
          <div className="chain-header">
            <WalletImg src={wc.option.iconUrl} name={name} size={44} />
            <h1 className="card__title">{title}</h1>
            <p className="card__subtitle">{subtitle}</p>
          </div>

          {wc.status === "qr" && (
            <div className="qr">
              <QRCodeSVG
                value={wc.uri}
                size={216}
                marginSize={2}
                level="Q"
                fgColor="#0e121b"
                bgColor="#ffffff"
                imageSettings={{
                  src: wc.option.iconUrl ?? "",
                  height: 44,
                  width: 44,
                  excavate: true,
                }}
              />
            </div>
          )}

          {wc.status === "preparing" && (
            <div className="status">
              <Spinner size="sm" />
              Preparing…
            </div>
          )}

          {wc.status === "ready" && (
            <div className="actions">
              {wc.deeplink && (
                <a
                  className="btn-primary btn-primary--block"
                  href={wc.deeplink}
                  onClick={markConnecting}
                >
                  Open {name}
                </a>
              )}
              {wc.inAppUrl && (
                <a
                  className={wc.deeplink ? "btn-ghost" : "btn-primary btn-primary--block"}
                  href={inAppHref(wc.inAppUrl)}
                  onClick={markConnecting}
                >
                  {wc.deeplink ? `Open in ${name}'s browser instead` : `Open ${name}`}
                </a>
              )}
            </div>
          )}

          {wc.status === "connecting" && (
            <>
              <div className="status">
                <Spinner size="sm" />
                Waiting for approval…
              </div>
              {wc.deeplink && (
                <div className="actions">
                  <a className="btn-ghost" href={wc.deeplink}>
                    Reopen {name}
                  </a>
                </div>
              )}
            </>
          )}

          {wc.status === "error" && (
            <>
              <ErrorBanner message={wc.message} className="mb-4" />
              <Button onClick={() => startWalletConnect(wc.option, wc.opt)} className="mt-4 h-12 w-full text-base">
                Try again
              </Button>
            </>
          )}

          {(wc.status === "ready" || wc.status === "qr") &&
            (() => {
              const installUrl = installLinkFor(wc.option);
              return installUrl ? (
                <p className="install-hint">
                  Don't have {name}?{" "}
                  <a href={installUrl} target="_blank" rel="noopener noreferrer">
                    {isMobile() ? "Get the app" : "Install the extension"}
                  </a>
                </p>
              ) : null;
            })()}
        </main>
        <Disclosure />
        {debug && <DebugPanel />}
      </div>
    );
  }

  // Can't connect here (e.g. Phantom on desktop with no QR path).
  if (unavailable) {
    const { option, installUrl } = unavailable;
    const mobile = isMobile();
    const guidance = mobile
      ? `Install the ${option.name} app to continue, or try a different wallet.`
      : `Install the ${option.name} browser extension to connect, or open this page on your phone to use the ${option.name} app.`;
    return (
      <div className="page">
        <main className="card" key="unavailable">
          <BackButton
            onClick={() => {
              setUnavailable(null);
              setError(null);
            }}
          />
          <div className="chain-header">
            <WalletImg src={option.iconUrl} name={option.name} size={44} />
            <h1 className="card__title">Connect {option.name}</h1>
            <p className="card__subtitle">{guidance}</p>
          </div>
          {installUrl && (
            <Button onClick={() => window.open(installUrl, "_blank", "noopener,noreferrer")} className="mt-4 h-12 w-full text-base">
              {mobile ? `Install ${option.name}` : `Add ${option.name} to your browser`}
            </Button>
          )}
        </main>
        <Disclosure />
      </div>
    );
  }

  // Chain picker (multi-chain wallet).
  if (pending) {
    const connectors = installedConnectors(pending);
    return (
      <div className="page">
        <main className="card" key="pending">
          {/* Centred wallet icon over title over prose, and the same text Back
              as every other screen here.
           *
              The alternative - a round back button inline with a left-aligned
              eyebrow + title, matching packages/checkouts-widget - was tried and
              is worse on this screen. It needs the wallet named twice (title plus
              an explanatory line) and leaves the wallet icon with nowhere to sit,
              and it made this the only screen in the app with a different back
              affordance. Centred, the wallet is the subject and the two chains
              are plainly the choice. */}
          <BackButton
            onClick={() => {
              setPending(null);
              setError(null);
            }}
          />
          <div className="chain-header">
            <WalletImg src={pending.iconUrl} name={pending.name} size={44} />
            <h1 className="card__title">Choose a chain</h1>
            <p className="card__subtitle">
              {pending.name} works on more than one chain. Pick where you'd like
              to connect.
            </p>
          </div>

          {error && <ErrorBanner message={error} className="mb-4" />}

          <div className="list">
            {connectors.map((c) => {
              const meta = chainMeta(c.chain);
              return (
                <ListRow
                  key={c.walletProviderKey}
                  label={meta.title}
                  sublabel={meta.subtitle}
                  icon={<ChainIcon chain={c.chain} size={28} />}
                  iconSize="lg"
                  disabled={Boolean(connectingKey)}
                  isLoading={connectingKey === c.walletProviderKey}
                  loadingText="Connecting..."
                  onClick={() => {
                    milestone("chain_selected", {
                      wallet: pending.name,
                      chain: normalizeChain(c.chain),
                    });
                    void connect(c, pending);
                  }}
                  className="group h-auto gap-3 rounded-(--brand-radius) px-4 py-3"
                  rightContent={<RowChevron />}
                />
              );
            })}
          </div>
        </main>
        <Disclosure />
      </div>
    );
  }

  // Manual address entry.
  if (view === "manual") {
    const trimmed = manualAddress.trim();
    const detected = detectAddressChain(manualAddress);
    return (
      <div className="page">
        <main className="card" key="manual">
          <BackButton
            onClick={() => {
              setView("home");
              setError(null);
            }}
          />
          <p className="eyebrow">Connect a wallet</p>
          <h1 className="card__title">Add a wallet address</h1>

          <textarea
            className="address-input"
            placeholder="0x… or a Solana address"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            rows={3}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Wallet address"
          />

          {trimmed &&
            (detected ? (
              <div className="detect-chip">
                <ChainIcon chain={detected === "evm" ? "polygon" : "solana"} size={22} />
                <span>{detected === "evm" ? "Polygon" : "Solana"}</span>
              </div>
            ) : isTronAddress(manualAddress) ? (
              <p className="detect-hint">
                That looks like a Tron address, which isn't supported. Enter an
                EVM or Solana address.
              </p>
            ) : (
              <p className="detect-hint">
                Unrecognized address. Enter a valid EVM or Solana address.
              </p>
            ))}

          <Button disabled={!detected} onClick={submitManual} className="mt-4 h-12 w-full text-base">
            Continue
          </Button>
        </main>
        <Disclosure />
      </div>
    );
  }

  const isConnecting = (w: WalletOption) =>
    connectingKey !== null &&
    installedConnectors(w).some((c) => c.walletProviderKey === connectingKey);

  const ready = initStatus === "finished" && !catalogueLoading;
  const term = search.trim();
  const shown = term ? list : featured;
  const hiddenCount = list.length - featured.length;

  // Home - one page: search on top, four featured wallets, and the rest via
  // search (typing filters the full catalogue in place).
  return (
    <div className="page">
      <main className="card" key="home">
        <p className="eyebrow">Connect a wallet</p>
        <h1 className="card__title">Pick a wallet to continue</h1>

        {error && <ErrorBanner message={error} className="mb-4" />}

        {initStatus === "failed" ? (
          <ErrorBanner message="Couldn't load wallets. Check your connection and that this origin is allow-listed in the Dynamic dashboard, then refresh the page." />
        ) : !ready ? (
          <ConnectSkeletonBody />
        ) : (
          <>
            <SearchField value={search} onChange={setSearch} />

            <div className={`list${term ? " list--scroll" : ""}`}>
              {shown.length === 0 ? (
                <p className="empty">No wallets match "{term}".</p>
              ) : (
                shown.map((w) => (
                  <WalletTile
                    key={w.key}
                    option={w}
                    connecting={isConnecting(w)}
                    disabled={Boolean(connectingKey)}
                    onSelect={handleSelect}
                  />
                ))
              )}
            </div>

            {!term && hiddenCount > 0 && (
              <p className="list-hint">Search to find {hiddenCount}+ more wallets</p>
            )}

            <p className="list-manual">
              Can't find your wallet?{" "}
              <button type="button" className="text-link" onClick={() => setView("manual")}>
                Enter your address manually
              </button>
            </p>
          </>
        )}
      </main>
      <Disclosure />
      {debug && <DebugPanel />}
    </div>
  );
}
