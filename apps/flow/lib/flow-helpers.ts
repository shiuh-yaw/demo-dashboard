/**
 * Helpers surfaced inside each scenario's right-rail panel alongside
 * the Integration walkthrough.
 *
 * Every scenario shares the same four helpers — all Dynamic SDK
 * imports, no project wrappers — so integrators see the *exact* call
 * shape they'd write themselves. The only intentional variation is
 * the `getBalances` signature on `/withdraw` (it pins `networkId` and
 * sets `forceRefresh: true`, because reads against a fresh WaaS
 * wallet silently default to mainnet chainId 1 without it).
 */

export type HelperTag =
  | "Embedded"
  | "Picker"
  | "WalletConnect"
  | "Balances"
  | "Balance"
  | "Source UI"
  | "Exchange";

export interface HelperDef {
  /** Stable id for React keys + anchor links. */
  id: string;
  /** Tuple of [functionName, "(args)"]. Rendered with monospace font. */
  sig: [string, string];
  /** Pill label categorising the helper. */
  tag: HelperTag;
  /**
   * One-sentence rationale. May contain `backtick`-delimited inline
   * code spans — `CodePanel`'s `renderProse` turns them into chips.
   */
  desc: string;
  /** Plain TypeScript that Shiki will highlight server-side. */
  rawCode: string;
  /**
   * Canonical Dynamic docs URL for this helper. Surfaced as a "Read
   * the docs" link on the helper card so integrators can jump from
   * the demo to the full API reference in one click. Omit to suppress
   * the link on a per-helper basis (e.g. when the helper's signature
   * is a scenario-specific variant whose canonical docs already cover
   * the base call).
   */
  docsUrl?: string;
}


export interface ScenarioExtras {
  helpers: HelperDef[];
}

export interface WebhookEventDef {
  /** Stable id for React keys. */
  id: string;
  /** Wire event name (e.g. `flow.settlement.updated`). */
  name: string;
  /** Pill label categorising the event axis. */
  tag: "Execution" | "Settlement" | "Risk";
  /**
   * When this event fires — one or two sentences. May contain
   * `backtick`-delimited inline code spans (rendered via
   * `CodePanel`'s `renderProse`).
   */
  desc: string;
  /** Pretty-printed sample payload (JSON, server-side highlighted). */
  rawPayload: string;
  /**
   * Canonical Dynamic docs URL for THIS event's payload schema.
   * Anchors into the events-overview page (e.g.
   * `…/webhooks/events#param-checkout-transaction-execution-updated`)
   * so the "Read the docs →" link drops the reader at the exact
   * event the card describes.
   */
  docsUrl: string;
}

/**
 * Canonical Dynamic docs URL for the Webhooks tab's handler card.
 * The per-event cards link to their own schema sections (see each
 * `WEBHOOK_EVENTS[i].docsUrl`); this URL is the setup-page reference
 * for everything the handler snippet does (HMAC verification,
 * signature header, raw-body discipline).
 */
export const WEBHOOK_DOCS_URL =
  "https://www.dynamic.xyz/docs/overview/developer-dashboard/webhooks/setup";

/**
 * Per-event schema anchor on the events-overview page. Dynamic's
 * docs use Mintlify `#param-<dashed-event-name>` hashes for each
 * event's payload section. Built from the wire event name so a new
 * event entry only needs its `name` — `docsUrl` derives below.
 */
const WEBHOOK_EVENTS_PAGE =
  "https://www.dynamic.xyz/docs/overview/developer-dashboard/webhooks/events";

function eventSchemaUrl(eventName: string): string {
  return `${WEBHOOK_EVENTS_PAGE}#param-${eventName.replace(/\./g, "-")}`;
}

// =============================================================================
// Webhooks — scenario-agnostic. Dynamic POSTs the same three Flow axis
// events for every flow; the *reactions* differ per scenario (covered in
// each scenario's AI prompt), but the wire shape is identical.
// =============================================================================

/**
 * Minimal Next.js App Router handler showing the full HMAC-verified
 * receiver pattern. Surfaced as the entry-point code block on the
 * Webhooks tab so integrators have a ready-to-paste server route.
 */
export const WEBHOOK_HANDLER_CODE = `import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

// Always verify BEFORE parsing the body. timingSafeEqual prevents
// the leak; verifying the raw bytes prevents tampered re-serialise.
function verify(rawBody: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.DYNAMIC_WEBHOOK_SECRET!)
    .update(rawBody, "utf8")
    .digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-dynamic-signature-256") ?? "";
  if (!verify(raw, sig)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(raw) as {
    eventName: string;
    messageId: string;
    data: {
      axis: "execution" | "settlement" | "risk";
      flowId: string;
      previousState: string;
      newState: string;
      additionalData?: Record<string, unknown>;
    };
  };

  if (
    payload.eventName === "flow.settlement.updated" &&
    payload.data.newState === "completed"
  ) {
    // Credit the user, send the receipt, mark the order fulfilled.
    await onSettled(payload.data.flowId);
  }

  return NextResponse.json({ ok: true });
}`;

export const WEBHOOK_EVENTS: readonly WebhookEventDef[] = [
  {
    id: "execution",
    name: "flow.execution.updated",
    tag: "Execution",
    desc: "Fires on every state change along the execution axis — source attach, quote lock, signing payload ready, broadcast received. Useful for surfacing live progress in your UI.",
    rawPayload: `{
  "eventName": "flow.execution.updated",
  "messageId": "5a2a5360-bb7e-4ea6-9bd3-0146bf2f734f",
  "data": {
    "axis": "execution",
    "flowId": "fl_01H8X...",
    "previousState": "quoted",
    "newState": "signing",
    "additionalData": {
      "fromChainId": "8453"
    }
  }
}`,
    docsUrl: eventSchemaUrl("flow.execution.updated"),
  },
  {
    id: "settlement",
    name: "flow.settlement.updated",
    tag: "Settlement",
    desc: "Fires on every state change along the settlement axis. The terminal `completed` and `failed` transitions land here — this is the production replacement for polling.",
    rawPayload: `{
  "eventName": "flow.settlement.updated",
  "messageId": "5a2a5360-bb7e-4ea6-9bd3-0146bf2f734f",
  "data": {
    "axis": "settlement",
    "flowId": "fl_01H8X...",
    "previousState": "settling",
    "newState": "completed",
    "additionalData": {
      "destinationAddress": "0xF1CB...",
      "txHash": "0xa1b2..."
    }
  }
}`,
    docsUrl: eventSchemaUrl("flow.settlement.updated"),
  },
  {
    id: "risk",
    name: "flow.risk.updated",
    tag: "Risk",
    desc: "Risk + sanctions screening result. Fires when the source wallet is attached and again when the settlement destination is evaluated. A `blocked` transition is the surface for a compliance reject.",
    rawPayload: `{
  "eventName": "flow.risk.updated",
  "messageId": "5a2a5360-bb7e-4ea6-9bd3-0146bf2f734f",
  "data": {
    "axis": "risk",
    "flowId": "fl_01H8X...",
    "previousState": "unknown",
    "newState": "cleared",
    "additionalData": {
      "score": 12,
      "sanctions": []
    }
  }
}`,
    docsUrl: eventSchemaUrl("flow.risk.updated"),
  },
];

// =============================================================================
// Helper code snippets — kept here so the page can highlight all five
// (six on withdraw) in parallel with the existing stepper highlights.
// =============================================================================

const CREATE_WAAS_EVM_CODE = `import { createWaasWalletAccounts } from "@dynamic-labs-sdk/client/waas";

await createWaasWalletAccounts({
  chains: ["EVM"],
});`;

const CREATE_WAAS_SOL_CODE = `import { createWaasWalletAccounts } from "@dynamic-labs-sdk/client/waas";

await createWaasWalletAccounts({
  chains: ["SOL"],
});`;

const WALLET_PROVIDERS_CODE = `import { getAvailableWalletProvidersData } from "@dynamic-labs-sdk/client";

const providers = getAvailableWalletProvidersData();
// providers[i] → { key, chain, displayName, icon, groupKey, … }`;

const WALLETCONNECT_CATALOG_CODE = `import { getWalletConnectCatalog } from "@dynamic-labs-sdk/client";

const catalog = await getWalletConnectCatalog();`;

const GET_BALANCES_CHECKOUT_CODE = `import { getBalances } from "@dynamic-labs-sdk/client";

const tokens = await getBalances({
  walletAccount,
  includePrices: true,
});`;

const GET_BALANCES_DEPOSIT_CODE = `import { getBalances } from "@dynamic-labs-sdk/client";

const tokens = await getBalances({
  walletAccount: external,
  includePrices: true,
});`;

const GET_BALANCES_WITHDRAW_CODE = `import { getBalances } from "@dynamic-labs-sdk/client";

const bal = await getBalances({
  walletAccount: embedded,
  networkId: 101, // Solana mainnet
  forceRefresh: true,
});`;

// =============================================================================
// Shared helper definitions — three are identical across all scenarios.
// The fourth (`getBalances`) varies only on /withdraw.
// =============================================================================

const SHARED_CREATE_WAAS_EVM: HelperDef = {
  id: "createWaasWalletAccounts",
  sig: ["createWaasWalletAccounts", "({ chains })"],
  tag: "Embedded",
  desc: "Provisions an embedded WaaS wallet for users who don't bring their own. Call once per user after authentication; the SDK is a no-op if the wallet already exists on the chosen chain.",
  rawCode: CREATE_WAAS_EVM_CODE,
  docsUrl:
    "https://www.dynamic.xyz/docs/javascript/reference/waas/creating-waas-wallet-accounts",
};

const SHARED_CREATE_WAAS_SOL: HelperDef = {
  id: "createWaasWalletAccounts",
  sig: ["createWaasWalletAccounts", "({ chains })"],
  tag: "Embedded",
  desc: "Provisions an embedded SOL WaaS wallet — the platform anchor for withdraw. Call once per user after authentication; the SDK is a no-op if the wallet already exists.",
  rawCode: CREATE_WAAS_SOL_CODE,
  docsUrl:
    "https://www.dynamic.xyz/docs/javascript/reference/waas/creating-waas-wallet-accounts",
};

const SHARED_WALLET_PROVIDERS: HelperDef = {
  id: "wallet-providers",
  sig: ["getAvailableWalletProvidersData", "()"],
  tag: "Picker",
  desc: "List the wallet providers configured for your Dynamic environment. The SDK returns one entry per provider-chain pair (e.g. MetaMask EVM + MetaMask SOL are separate entries).",
  rawCode: WALLET_PROVIDERS_CODE,
  docsUrl:
    "https://www.dynamic.xyz/docs/javascript/reference/wallets/get-available-wallets-to-connect",
};

const SHARED_WC_CATALOG: HelperDef = {
  id: "getWalletConnectCatalog",
  sig: ["getWalletConnectCatalog", "()"],
  tag: "WalletConnect",
  desc: "Fetch the wallet catalog — 600+ wallets (Phantom, Rainbow, Trust, and more) — so you can render a WalletConnect picker.",
  rawCode: WALLETCONNECT_CATALOG_CODE,
  docsUrl:
    "https://www.dynamic.xyz/docs/javascript/reference/wallets/walletconnect-integration",
};

// =============================================================================
// Exchange helper definitions — Kraken OAuth + balance + whitelisting + transfer.
// Surfaced on Checkout + Deposit (exchanges are funding sources, not withdraw).
// =============================================================================

const EXCHANGE_OAUTH_CODE = `import {
  signInWithSocialRedirect,
  detectSocialRedirectUrl,
  completeSocialRedirect,
} from "@dynamic-labs-sdk/client";

// 1. Redirect to Kraken OAuth
await signInWithSocialRedirect({
  provider: "kraken",
  redirectUrl: window.location.origin + window.location.pathname,
});

// 2. On return, detect and complete the redirect
const url = new URL(window.location.href);
const isReturning = await detectSocialRedirectUrl({ url });
if (isReturning) {
  await completeSocialRedirect({ url });
  // User's Kraken account is now connected
}`;

const KRAKEN_ACCOUNTS_CODE = `import { getKrakenAccounts } from "@dynamic-labs-sdk/client";

const accounts = await getKrakenAccounts();
// accounts[0].balances → [{ currency: "ETH", balance: 2.5 }, …]`;

const KRAKEN_WHITELISTING_CODE = `import { getKrakenWhitelistedAddresses } from "@dynamic-labs-sdk/client";

const { destinations, enforcesAddressWhitelist } =
  await getKrakenWhitelistedAddresses();

if (enforcesAddressWhitelist) {
  // User can only withdraw to these pre-approved addresses
  destinations.forEach((d) =>
    console.log(d.address, d.tokens),
  );
}`;

const KRAKEN_TRANSFER_CODE = `import {
  createKrakenExchangeTransfer,
  getKrakenAccounts,
} from "@dynamic-labs-sdk/client";

const accounts = await getKrakenAccounts();

const transfer = await createKrakenExchangeTransfer({
  accountId: accounts[0].id,
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f7ABCD",
  amount: 0.5,
  currency: "ETH",
});
// transfer → { id, status: "pending" | "completed" | "failed" }`;

const EXCHANGE_OAUTH: HelperDef = {
  id: "exchange-oauth",
  sig: ["signInWithSocialRedirect", '({ provider, redirectUrl })'],
  tag: "Exchange",
  desc: "Connect a Kraken exchange account via OAuth. Redirects to Kraken's authorization page; on return, call `detectSocialRedirectUrl` + `completeSocialRedirect` to finish the handshake.",
  rawCode: EXCHANGE_OAUTH_CODE,
  docsUrl:
    "https://www.dynamic.xyz/docs/javascript/authentication-methods/social",
};

const KRAKEN_ACCOUNTS: HelperDef = {
  id: "getKrakenAccounts",
  sig: ["getKrakenAccounts", "()"],
  tag: "Exchange",
  desc: "Fetch the user's Kraken exchange balances. Returns accounts with per-currency balances — use `accountId` from the response when creating transfers.",
  rawCode: KRAKEN_ACCOUNTS_CODE,
  docsUrl:
    "https://www.dynamic.xyz/docs/javascript/reference/client/get-kraken-accounts",
};

const KRAKEN_WHITELISTING: HelperDef = {
  id: "getKrakenWhitelistedAddresses",
  sig: ["getKrakenWhitelistedAddresses", "()"],
  tag: "Exchange",
  desc: "Check whether the user's Kraken account enforces address whitelisting and retrieve the approved destinations. When enforced, withdrawals can only go to pre-approved address+token pairs.",
  rawCode: KRAKEN_WHITELISTING_CODE,
  docsUrl:
    "https://www.dynamic.xyz/docs/javascript/reference/client/get-kraken-whitelisted-addresses",
};

const KRAKEN_TRANSFER: HelperDef = {
  id: "createKrakenExchangeTransfer",
  sig: ["createKrakenExchangeTransfer", "({ accountId, to, amount, currency })"],
  tag: "Exchange",
  desc: "Execute a withdrawal from Kraken to an external wallet. Requires `accountId` from `getKrakenAccounts` and a destination that passes the whitelisting check.",
  rawCode: KRAKEN_TRANSFER_CODE,
  docsUrl:
    "https://www.dynamic.xyz/docs/javascript/reference/client/create-kraken-exchange-transfer",
};

// =============================================================================
// Per-scenario exports.
// =============================================================================

export const CHECKOUT_EXTRAS: ScenarioExtras = {
  helpers: [
    // `createWaasWalletAccounts` intentionally omitted — Checkout's
    // source is the buyer's external wallet, not an embedded WaaS
    // wallet, so the WaaS provisioning step doesn't apply here.
    SHARED_WALLET_PROVIDERS,
    SHARED_WC_CATALOG,
    {
      id: "getBalances",
      sig: ["getBalances", "({ walletAccount, includePrices })"],
      tag: "Balances",
      desc: "List the source wallet's tokens. For Checkout, you typically don't pin `networkId` — let the buyer pay from any chain they hold funds on.",
      rawCode: GET_BALANCES_CHECKOUT_CODE,
      docsUrl:
        "https://www.dynamic.xyz/docs/javascript/reference/wallets/get-balances",
    },
    // Exchange helpers — Kraken OAuth, balance, whitelisting, transfer.
    EXCHANGE_OAUTH,
    KRAKEN_ACCOUNTS,
    KRAKEN_WHITELISTING,
    KRAKEN_TRANSFER,
  ],
};

export const DEPOSIT_EXTRAS: ScenarioExtras = {
  helpers: [
    // `createWaasWalletAccounts` intentionally omitted — Deposit's
    // source is the user's external wallet (the destination embedded
    // wallet is provisioned via the regular Dynamic auth flow, not as
    // a standalone helper an integrator needs to surface).
    SHARED_WALLET_PROVIDERS,
    SHARED_WC_CATALOG,
    {
      id: "getBalances",
      sig: ["getBalances", "({ walletAccount, includePrices })"],
      tag: "Source UI",
      desc: "List the source wallet's tokens so the user can pick which one to deposit. Pass `includePrices` to render USD values inline.",
      rawCode: GET_BALANCES_DEPOSIT_CODE,
      docsUrl:
        "https://www.dynamic.xyz/docs/javascript/reference/wallets/get-balances",
    },
    // Exchange helpers — Kraken OAuth, balance, whitelisting, transfer.
    EXCHANGE_OAUTH,
    KRAKEN_ACCOUNTS,
    KRAKEN_WHITELISTING,
    KRAKEN_TRANSFER,
  ],
};

export const WITHDRAW_EXTRAS: ScenarioExtras = {
  helpers: [
    SHARED_CREATE_WAAS_SOL,
    SHARED_WALLET_PROVIDERS,
    SHARED_WC_CATALOG,
    {
      id: "getBalances",
      sig: ["getBalances", "({ walletAccount, networkId, forceRefresh })"],
      tag: "Balance",
      desc: "Read the platform balance. Pass `forceRefresh` to bypass Dynamic's server-side cache for fresh onchain reads.",
      rawCode: GET_BALANCES_WITHDRAW_CODE,
      // Docs link intentionally omitted — this is a withdraw-flavoured
      // variant of the same `getBalances` covered by the canonical
      // helper on Checkout / Deposit. The shared docs would just
      // repeat what the snippet already shows.
    },
  ],
};
