// Best-effort detection of the runtime container. Embedded web views (an app's
// WKWebView, an in-app browser) behave differently from a normal mobile Safari
// tab: custom URL schemes and universal links don't open automatically, storage
// is isolated, and the host app owns navigation. We can't detect this perfectly
// from JS - user-agent strings vary per host app and iOS gives us no reliable
// flag - so this is a heuristic, and the `?debug` panel surfaces the raw signals
// so we can refine against a real device's UA.

export type EnvInfo = {
  userAgent: string;
  isIos: boolean;
  isAndroid: boolean;
  /** Home-screen PWA (Safari's `navigator.standalone`). Not a web view. */
  isStandalone: boolean;
  /** UA carries both the `Safari` and `Version/` tokens (a real Safari tab). */
  looksLikeSafari: boolean;
  /** Our best guess that we're inside an embedded web view. */
  isWebView: boolean;
  /** HTTPS or localhost - required for WebCrypto (WalletConnect URI minting). */
  isSecureContext: boolean;
};

function detectIos(ua: string): boolean {
  if (/iP(hone|ad|od)/.test(ua)) return true;
  // iPadOS 13+ reports a desktop-Mac UA; disambiguate via touch points.
  return (
    typeof navigator !== "undefined" &&
    navigator.platform === "MacIntel" &&
    (navigator.maxTouchPoints ?? 0) > 1
  );
}

export function getEnvInfo(): EnvInfo {
  if (typeof navigator === "undefined") {
    return {
      userAgent: "",
      isIos: false,
      isAndroid: false,
      isStandalone: false,
      looksLikeSafari: false,
      isWebView: false,
      isSecureContext: false,
    };
  }
  const ua = navigator.userAgent;
  const isIos = detectIos(ua);
  const isAndroid = /Android/.test(ua);
  const isStandalone =
    "standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true;
  const looksLikeSafari = /Safari/.test(ua) && /Version\//.test(ua);

  // Explicit signal from the host is authoritative and beats UA guessing: a
  // native app that embeds this flow passes `?embedded=1` (or `platform=webview`).
  // This matters because ASWebAuthenticationSession / SFSafariViewController run
  // a real Safari and keep the Safari UA token, so the heuristic below can't tell
  // them apart from a normal tab - but they still need embedded behavior (native
  // deeplinks, no Phantom redirect protocol).
  const params =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const forcedEmbedded =
    params.has("embedded") ||
    ["webview", "native", "ios-native", "android-native"].includes(
      (params.get("platform") ?? "").toLowerCase(),
    );

  // Fallback UA heuristic when no explicit signal: a real Safari tab carries both
  // Safari + Version/ tokens; a home-screen PWA sets `standalone`. Anything else
  // on iOS is almost certainly a WKWebView host that dropped the Safari token.
  // Android WebView UAs carry a `; wv)` marker.
  const uaWebView = isIos
    ? !isStandalone && !looksLikeSafari
    : isAndroid
      ? /;\s*wv\)/.test(ua)
      : false;
  const isWebView = forcedEmbedded || uaWebView;

  return {
    userAgent: ua,
    isIos,
    isAndroid,
    isStandalone,
    looksLikeSafari,
    isWebView,
    isSecureContext: typeof isSecureContext === "boolean" ? isSecureContext : false,
  };
}
