import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as Crypto from "expo-crypto";

// ── Public API ──────────────────────────────────────────────────────────────

/** A wallet the user connected through the hosted Fireblocks flow. */
export interface WalletConnection {
  address: string;
  /** "evm" | "solana" */
  chain: string;
  walletName: string;
  /** Icon URL — often an SVG-sprite URL, so render it in a WebView `<img>`. */
  walletImage: string;
}

/** Thrown when the user dismisses the sheet. */
export class FireblocksConnectCancelled extends Error {}
/** Thrown on a nonce mismatch or an unparseable return. */
export class FireblocksConnectError extends Error {}

/**
 * Connect a self-custodial wallet through a hosted Fireblocks page — no SDK.
 *
 * ```ts
 * const wallet = await connectWallet({
 *   flowURL: "https://connect.example.com/",
 *   scheme: "myapp",              // must match your app.json "scheme"
 * });
 * console.log(wallet.address, wallet.chain);
 * ```
 *
 * Opens the page with `expo-web-browser`'s auth session
 * (`ASWebAuthenticationSession` on iOS, Chrome Custom Tabs on Android). It
 * appends `redirect_uri`, a random `nonce`, and `embedded=1`, verifies the
 * returned nonce, and resolves with the wallet.
 *
 * Most wallets return inside the session; some (Phantom) finish in their own
 * in-app browser and return via the scheme out-of-band — so we also listen on
 * `Linking` and dismiss the session when that happens. No extra wiring needed.
 */
export async function connectWallet(params: {
  flowURL: string;
  scheme: string;
}): Promise<WalletConnection> {
  const { flowURL, scheme } = params;
  const redirectUri = `${scheme}://wallet-callback`;
  const nonce = randomNonce();
  const url = withParams(flowURL, { redirect_uri: redirectUri, nonce, embedded: "1" });

  const callbackUrl = await openAndAwaitReturn(url, redirectUri);
  return verify(callbackUrl, nonce);
}

// ── Internals ─────────────────────────────────────────────────────────────

/** Race the auth session against a deep-link listener (out-of-band returns). */
function openAndAwaitReturn(url: string, redirectUri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      subscription.remove();
      fn();
    };

    const subscription = Linking.addEventListener("url", ({ url: incoming }) => {
      if (incoming.startsWith(redirectUri)) {
        WebBrowser.dismissAuthSession(); // close the still-open sheet
        finish(() => resolve(incoming));
      }
    });

    // preferEphemeralSession skips the "<app> wants to use <domain> to sign in"
    // consent alert (no shared cookies), matching the native iOS behavior.
    WebBrowser.openAuthSessionAsync(url, redirectUri, { preferEphemeralSession: true })
      .then((result) => {
        if (result.type === "success") finish(() => resolve(result.url));
        else finish(() => reject(new FireblocksConnectCancelled("Cancelled")));
      })
      .catch((error) => finish(() => reject(error)));
  });
}

function verify(callbackUrl: string, expectedNonce: string): WalletConnection {
  const { queryParams } = Linking.parse(callbackUrl);
  const value = (key: string): string => {
    const v = queryParams?.[key];
    return typeof v === "string" ? v : "";
  };
  if (value("nonce") !== expectedNonce) {
    throw new FireblocksConnectError("Nonce mismatch"); // possible CSRF — reject
  }
  const address = value("address");
  if (!address) throw new FireblocksConnectError("Malformed result");
  return {
    address,
    chain: value("chain"),
    walletName: value("walletName"),
    walletImage: value("walletImage"),
  };
}

/** Append params without relying on RN's spotty URL/URLSearchParams support. */
function withParams(base: string, extra: Record<string, string>): string {
  const query = Object.entries(extra)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return base + (base.includes("?") ? "&" : "?") + query;
}

/** Cryptographically-random nonce (CSRF correlation). Not a secret, but must
 *  be unguessable. */
function randomNonce(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
