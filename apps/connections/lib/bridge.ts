// The JS→native channel for the headless engine.
//
// On iOS the hidden WKWebView installs `window.webkit.messageHandlers.headless`, and
// native drives the engine by calling `window.headlessConnect.*` via
// `evaluateJavaScript`. On a desktop test page the engine is loaded in an
// iframe and messages are relayed with `postMessage` to the parent, so the same
// engine is verifiable in a browser before any Swift exists.

export type HostMessage =
  // Engine finished SDK init and is ready to accept connect() calls.
  | { type: "ready" }
  // The wallet menu, derived live from the catalogue (replaces a static
  // walletbook file). Sent once when the engine is ready.
  | {
      type: "wallets";
      wallets: Array<{
        key: string;
        name: string;
        icon: string;
        chains: string[];
        mode: "headless" | "fallback";
        featured: boolean;
      }>;
    }
  // A single openable deeplink; native calls UIApplication.open on it.
  | { type: "deeplink"; requestId: string; url: string }
  // The wallet is being opened by other means (e.g. Phantom's redirect, which
  // the WebView navigates to and the native nav-delegate opens). Tells native to
  // stop the startup-timeout and wait for the user to approve.
  | { type: "opening"; requestId: string }
  // Terminal success.
  | {
      type: "connected";
      requestId: string;
      address: string;
      chain: string;
      walletName: string;
      walletImage: string;
      sessionId: string;
    }
  // This wallet can't go headless (needs a visible browsing context, or has no
  // WalletConnect/MetaMask URI path); native should open the visible flow.
  | { type: "fallback"; requestId: string; reason: string }
  // Terminal failure with a stable code.
  | { type: "error"; requestId: string; code: string; message: string; sessionId: string }
  // Message-signature result. `signature` is a hex string.
  | { type: "signed"; requestId: string; signature: string; message: string }
  | { type: "signFailed"; requestId: string; code: string; message: string }
  // Transaction-signature result. `signedTransaction` is RLP hex (EVM) or
  // base64 (Solana). Signed only - never broadcast.
  | { type: "signedTx"; requestId: string; signedTransaction: string; chain: string }
  | { type: "signTxFailed"; requestId: string; code: string; message: string }
  // Diagnostic timeline event (observability parity with the visible flow).
  | {
      type: "event";
      requestId?: string;
      event: string;
      data?: Record<string, unknown>;
      sessionId: string;
      t: number;
    };

export function sendToHost(msg: HostMessage): void {
  const json = JSON.stringify(msg);
  const w = window as unknown as {
    webkit?: { messageHandlers?: { headless?: { postMessage: (m: string) => void } } };
    walletNative?: { postMessage: (m: string) => void };
  };
  // iOS: the WKScriptMessageHandler named "headless".
  try {
    const wk = w.webkit?.messageHandlers?.headless;
    if (wk?.postMessage) {
      wk.postMessage(json);
      return;
    }
  } catch {
    /* fall through */
  }
  // Android: the @JavascriptInterface named "walletNative".
  try {
    if (w.walletNative?.postMessage) {
      w.walletNative.postMessage(json);
      return;
    }
  } catch {
    /* fall through to postMessage */
  }
  // Desktop test harness: relay to the embedding page.
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(json, "*");
    } else {
      window.postMessage(json, "*");
    }
  } catch {
    /* ignore */
  }
}
