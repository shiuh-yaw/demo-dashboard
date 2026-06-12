/**
 * Shared SDK + REST snippet generators for the Flow walkthrough panels.
 *
 * Each scenario page (`/checkout`, `/deposit`, `/withdraw`) renders a
 * 6-step walkthrough — the underlying API calls are identical across
 * scenarios; only `mode`, the `destinations[]` identifier, the source
 * actor label, and the surrounding prose differ. The prose lives in
 * each page's `STEP_DEFS`; the actual code samples are produced here
 * so the page bodies stay short.
 */

import type { ParsedFlowConfig } from "./flow-config/schema";
import { findTokenByAssetChain } from "./tokens";

export type StepTuple = [string, string, string, string, string, string];

/**
 * Canonical Dynamic docs URLs per integration step, in step order.
 * Surfaced as a "Read the docs →" affordance on each stepper card so
 * integrators can jump from the snippet to the full reference in one
 * click.
 *
 * Split per-tab because the two tabs document the same step at
 * different layers: the SDK tab points at the JS reference for the
 * helper function that wraps the call; the REST tab points at the
 * underlying API endpoint spec.
 *
 * Index matches `STEP_DEFS[i]` in each scenario page. URLs are
 * scenario-agnostic — the same SDK function powers the same step
 * across Checkout / Deposit / Withdraw — so they live here in the
 * shared snippet module rather than being duplicated three times.
 *
 * All URLs WebFetch-verified against www.dynamic.xyz/docs/...
 */
export const STEP_SDK_DOCS_URLS: readonly string[] = [
  // 01 — Create the Flow. The JS SDK doesn't expose a helper for
  // Checkout config creation (it's a server-side mint via the REST
  // API), so both tabs land on the same API reference page.
  "https://www.dynamic.xyz/docs/api-reference/checkout/create-a-checkout",
  // 02 — createCheckoutTransaction
  "https://www.dynamic.xyz/docs/javascript/reference/client/create-checkout-transaction",
  // 03 — attachCheckoutTransactionSource
  "https://www.dynamic.xyz/docs/javascript/reference/client/attach-checkout-transaction-source",
  // 04 — getCheckoutTransactionQuote
  "https://www.dynamic.xyz/docs/javascript/reference/client/get-checkout-transaction-quote",
  // 05 — submitCheckoutTransaction (collapses prepare/sign/broadcast)
  "https://www.dynamic.xyz/docs/javascript/reference/client/submit-checkout-transaction",
  // 06 — getCheckoutTransaction (poll until terminal)
  "https://www.dynamic.xyz/docs/javascript/reference/client/get-checkout-transaction",
];

export const STEP_API_DOCS_URLS: readonly string[] = [
  // 01 — POST /environments/{envId}/checkouts (config creation)
  "https://www.dynamic.xyz/docs/api-reference/checkout/create-a-checkout",
  // 02 — POST /checkouts/{checkoutId}/transactions
  "https://www.dynamic.xyz/docs/api-reference/sdk/create-a-checkout-transaction",
  // 03 — POST /transactions/{id}/source
  "https://www.dynamic.xyz/docs/api-reference/sdk/attach-a-source-to-a-checkout-transaction",
  // 04 — POST /transactions/{id}/quote
  "https://www.dynamic.xyz/docs/api-reference/sdk/get-a-quote-for-a-checkout-transaction",
  // 05 — REST splits the SDK's submit into prepare → sign → broadcast.
  // Link to `prepare` (the first server-side call); the page covers
  // the broadcast step alongside, and the snippet shows both.
  "https://www.dynamic.xyz/docs/api-reference/sdk/prepare-a-checkout-transaction-for-signing",
  // 06 — GET /transactions/{id} (poll until terminal)
  "https://www.dynamic.xyz/docs/api-reference/sdk/get-a-checkout-transaction-by-id",
];

/**
 * Intent-named scenario discriminator. Drives all per-scenario
 * branching across snippets, step prose, and code-panel wiring.
 *
 * "withdraw" maps to the API's `"deposit"` mode at the wire level
 * (`upstreamCheckoutMode()` below) because Dynamic models a withdraw
 * as a deposit into the user's destination wallet — but everywhere
 * upstream we keep the intent-named "withdraw" so demo code reads
 * symmetrically with the three scenario routes.
 */
export type ScenarioMode = "payment" | "deposit" | "withdraw";

/**
 * Default placeholder for the destination identifier in rendered
 * snippets. Surfaced when the call site doesn't supply a concrete
 * address — i.e. for Checkout/Deposit demos whose destinations are
 * configured server-side in the Checkout config, not at snippet-render
 * time. Withdraw demos pass an intent-named placeholder like
 * `"0xUSER_EXTERNAL_WALLET"` to communicate "user-supplied at runtime".
 */
export const DESTINATION_ADDRESS_PLACEHOLDER = "<destination_address>";

export interface FlowSnippetContext {
  config: ParsedFlowConfig;
  /** Drives the `mode` field in the Step 01 Flow-create payload. */
  mode: ScenarioMode;
  /**
   * Address that lands in `destinationConfig.destinations[0].identifier`
   * — the merchant vault for payment flows, the user's embedded wallet
   * for deposit flows, the user's external wallet for withdraw flows.
   * Omit to use `DESTINATION_ADDRESS_PLACEHOLDER` (the
   * `<destination_address>` fill-in-me token); withdraw passes
   * `"0xUSER_EXTERNAL_WALLET"` explicitly so the snippet reads as
   * scenario-correct (the destination is user-supplied at runtime,
   * not server-baked into the Checkout config).
   */
  destinationAddress?: string;
  /** Placeholder source address in the REST snippets (e.g., "0xBUYER", "0xUSER"). */
  sourceFromAddress?: string;
}

export function chainIdFor(chain: string): string {
  switch (chain) {
    case "base":
      return "8453";
    case "base-sepolia":
      return "84532";
    case "eth-sepolia":
      return "11155111";
    case "arb-sepolia":
      return "421614";
    case "ethereum":
      return "1";
    case "polygon":
      return "137";
    case "arbitrum":
      return "42161";
    case "optimism":
      return "10";
    case "solana":
      // Dynamic's SDK uses "101" for Solana mainnet in
      // settlementConfig (see dynamic-sdk's
      // `requiresConversion.spec.ts` fixture). Sending "mainnet"
      // causes the routing engine to fail with
      // "USDC@SOL-mainnet: unknown" because it can't resolve that
      // chainId to a known Solana network.
      return "101";
    default:
      return "8453";
  }
}

export function chainFamilyFor(chain: string): string {
  switch (chain) {
    case "solana":
      return "SOL";
    default:
      return "EVM";
  }
}

/** Chain key for a given chain ID (reverse of `chainIdFor`). */
export function chainKeyForId(chainId: number): string {
  switch (chainId) {
    case 8453:
      return "base";
    case 84532:
      return "base-sepolia";
    case 11155111:
      return "eth-sepolia";
    case 421614:
      return "arb-sepolia";
    case 1:
      return "ethereum";
    case 137:
      return "polygon";
    case 42161:
      return "arbitrum";
    case 10:
      return "optimism";
    case 101:
      return "solana";
    default:
      return "base";
  }
}

/**
 * Canonical settlement token addresses surfaced in the code samples.
 *
 * Throws on unknown (asset, chain) pairs. Earlier versions silently fell
 * back to Base USDC — which masked withdraw bugs where the user picks
 * "ETH on Base" but the server-side Checkout gets created with USDC as
 * the destination (causing the UI to show ETH while the quote engine
 * resolves the flow as USDC → USDC). Backed by the shared token
 * catalog in `lib/tokens.ts` — adding a new (asset, chain) pair means
 * adding a single Token record there.
 */
export function settlementTokenAddressFor(
  asset: string,
  chain: string,
): string {
  const token = findTokenByAssetChain(asset, chain);
  if (!token) {
    throw new Error(
      `settlementTokenAddressFor: no token address for asset="${asset}" chain="${chain}". ` +
        `Add a Token record to apps/flow/lib/tokens.ts (and the matching SETTLEMENT_OPTIONS ` +
        `row in apps/flow/app/withdraw/settlement-options.ts if it should be a picker entry) ` +
        `so the server-side Checkout destination matches what the UI rendered.`,
    );
  }
  return token.address;
}

export function tokenDecimalsFor(asset: string): number {
  switch (asset) {
    case "USDC":
    case "USDT":
    case "USDP":
    case "PYUSD":
      return 6;
    case "ETH":
      return 18;
    case "SOL":
      return 9;
    case "BTC":
      return 8;
    default:
      return 6;
  }
}

/**
 * Map our intent-named mode ("payment" | "deposit" | "withdraw") to
 * what the Dynamic Checkouts API actually accepts. Dynamic's API
 * only knows about `payment | deposit` — user-to-user withdrawals
 * are conceptually a deposit from the user's wallet into another
 * address, so they map onto the deposit primitive at the API
 * boundary. The snippet comment below makes this explicit so devs
 * copying the code don't get a 400.
 */
function upstreamCheckoutMode(mode: string): "payment" | "deposit" {
  return mode === "withdraw" ? "deposit" : (mode as "payment" | "deposit");
}

export function renderSdkSteps(ctx: FlowSnippetContext): StepTuple {
  const {
    config,
    mode,
    destinationAddress = DESTINATION_ADDRESS_PLACEHOLDER,
  } = ctx;
  const asset = config.asset.symbol;
  const chain = config.asset.chain;
  const chainName = chainFamilyFor(chain);
  const chainId = chainIdFor(chain);
  // Snippet rendering is a copy-paste educational surface, not a live
  // pipeline. If the (asset, chain) pair isn't in the resolver, render
  // an obvious placeholder instead of throwing — the API route handles
  // the real validation when a Checkout is actually minted.
  let tokenAddress: string;
  try {
    tokenAddress = settlementTokenAddressFor(asset, chain);
  } catch {
    tokenAddress = `<token-address-for-${asset}-on-${chain}>`;
  }
  const tokenDecimals = tokenDecimalsFor(asset);
  const apiMode = upstreamCheckoutMode(mode);
  const modeComment =
    mode === "withdraw"
      ? `      // Dynamic's API only accepts "payment" | "deposit" —\n` +
        `      // a withdraw is modeled as a deposit into the user's\n` +
        `      // destination wallet.\n`
      : "";

  // Step 01 — server-side, no client SDK equivalent. Use fetch.
  const step1 = `// Runs on your server — one-time per Flow config.
const res = await fetch(
  \`https://api.dynamic.xyz/v0/environments/\${process.env.ENV_ID}/checkouts\`,
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.DYNAMIC_API_TOKEN}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
${modeComment}      mode: "${apiMode}",
      settlementConfig: {
        strategy: "preferred_order",
        settlements: [
          {
            chainName: "${chainName}",
            chainId: "${chainId}",
            symbol: "${asset}",
            tokenAddress: "${tokenAddress}",
            tokenDecimals: ${tokenDecimals},
          },
        ],
      },
      destinationConfig: {
        destinations: [
          {
            chainName: "${chainName}",
            type: "address",
            identifier: "${destinationAddress}",
          },
        ],
      },
    }),
  },
);
const { id: flowId } = await res.json();`;

  const step2 = `import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { createCheckoutTransaction } from "@dynamic-labs-sdk/client";

addEvmExtension();

// Open a transaction against the Flow id returned in Step 01. Returns
// both the transaction and a one-time sessionToken — store the latter.
const { transaction, sessionToken } = await createCheckoutTransaction({
  checkoutId: flowId,
  amount: "5.00",
  currency: "USD",
});`;

  const step3 = `import {
  attachCheckoutTransactionSource,
  getActiveNetworkData,
  getPrimaryWalletAccount,
} from "@dynamic-labs-sdk/client";

const wallet = getPrimaryWalletAccount()!;
const { networkData } = await getActiveNetworkData({ walletAccount: wallet });

await attachCheckoutTransactionSource({
  transactionId: transaction.id,
  fromAddress: wallet.address,
  fromChainId: String(networkData.networkId),
  fromChainName: wallet.chain,
});
// 403 → source blocked by risk/sanctions screening.`;

  const step4 = `import {
  getBalances,
  getCheckoutTransactionQuote,
} from "@dynamic-labs-sdk/client";

// First non-zero balance — production would let the user pick which
// token to pay with.
const [fromToken] = await getBalances({ walletAccount: wallet });

const quoted = await getCheckoutTransactionQuote({
  transactionId: transaction.id,
  fromTokenAddress: fromToken.address,
  slippage: 0.005, // 0.5%
});
// quoted.quote.expiresAt — re-quote if the user takes longer than 60s.`;

  const step5 = `import { submitCheckoutTransaction } from "@dynamic-labs-sdk/client";

// One helper handles all three sub-stages:
//   1. prepare  → fetch the signing payload
//   2. sign     → wallet popup appears here
//   3. broadcast → notify Dynamic of the on-chain txHash
await submitCheckoutTransaction({
  transactionId: transaction.id,
  walletAccount: wallet,
});`;

  const step6 = `import {
  getCheckoutTransaction,
  isTerminalState,
} from "@dynamic-labs-sdk/client";

// Poll every 3s — or subscribe via the lifecycle webhook.
let tx = await getCheckoutTransaction({ transactionId: transaction.id });
while (!isTerminalState(tx)) {
  await new Promise((r) => setTimeout(r, 3000));
  tx = await getCheckoutTransaction({ transactionId: transaction.id });
}
// tx.settlementState === "completed" | "failed"`;

  return [step1, step2, step3, step4, step5, step6];
}

export function renderApiSteps(ctx: FlowSnippetContext): StepTuple {
  const {
    config,
    mode,
    destinationAddress = DESTINATION_ADDRESS_PLACEHOLDER,
    sourceFromAddress = "0xUSER",
  } = ctx;
  const asset = config.asset.symbol;
  const chain = config.asset.chain;
  const chainName = chainFamilyFor(chain);
  const chainId = chainIdFor(chain);
  // Snippet rendering is a copy-paste educational surface, not a live
  // pipeline. If the (asset, chain) pair isn't in the resolver, render
  // an obvious placeholder instead of throwing — the API route handles
  // the real validation when a Checkout is actually minted.
  let tokenAddress: string;
  try {
    tokenAddress = settlementTokenAddressFor(asset, chain);
  } catch {
    tokenAddress = `<token-address-for-${asset}-on-${chain}>`;
  }
  const tokenDecimals = tokenDecimalsFor(asset);
  const nativeTokenAddress = "0x0000000000000000000000000000000000000000";
  const apiMode = upstreamCheckoutMode(mode);
  // cURL JSON has no `//` comments, so we drop a `#`-prefixed line
  // above the curl invocation when the mode mapping applies.
  const modeNote =
    mode === "withdraw"
      ? `# Dynamic's API only accepts "payment" | "deposit" —\n# a withdraw is modeled as a deposit into the user's destination wallet.\n`
      : "";

  const step1 = `export ENV_ID="..."
export ADMIN_BASE="https://api.dynamic.xyz/v0/environments/$ENV_ID"
export SDK_BASE="https://api.dynamic.xyz/sdk/$ENV_ID"

${modeNote}# Server-side — uses your environment-scoped API token.
FLOW=$(curl -sX POST "$ADMIN_BASE/checkouts" \\
  -H "Authorization: Bearer $DYNAMIC_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "mode": "${apiMode}",
    "settlementConfig": {
      "strategy": "preferred_order",
      "settlements": [
        {
          "chainName": "${chainName}",
          "chainId": "${chainId}",
          "symbol": "${asset}",
          "tokenAddress": "${tokenAddress}",
          "tokenDecimals": ${tokenDecimals}
        }
      ]
    },
    "destinationConfig": {
      "destinations": [
        {
          "chainName": "${chainName}",
          "type": "address",
          "identifier": "${destinationAddress}"
        }
      ]
    }
  }')
FLOW_ID=$(echo "$FLOW" | jq -r .id)
# → checkout_...`;

  const step2 = `# User-facing — no auth required; the response carries the session token.
RESP=$(curl -sX POST "$SDK_BASE/checkouts/$FLOW_ID/transactions" \\
  -H "Content-Type: application/json" \\
  -d '{ "amount": "5.00", "currency": "USD" }')
SESSION=$(echo "$RESP" | jq -r .sessionToken)
TX_ID=$(echo "$RESP" | jq -r .transaction.id)
# → sessionToken (dct_...) and transaction id (ctx_...)`;

  const step3 = `curl -sX POST "$SDK_BASE/transactions/$TX_ID/source" \\
  -H "x-dynamic-checkout-session-token: $SESSION" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sourceType": "wallet",
    "fromAddress": "${sourceFromAddress}",
    "fromChainId": "${chainId}",
    "fromChainName": "${chainName}"
  }'
# 200 → executionState: "source_attached"
# 403 → blocked by risk/sanctions screening`;

  const step4 = `curl -sX POST "$SDK_BASE/transactions/$TX_ID/quote" \\
  -H "x-dynamic-checkout-session-token: $SESSION" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fromTokenAddress": "${nativeTokenAddress}",
    "slippage": 0.005
  }'
# → quote.fromAmount, quote.toAmount, quote.fees, quote.expiresAt (60s)`;

  const step5 = `# 5a. Prepare the signing payload.
curl -sX POST "$SDK_BASE/transactions/$TX_ID/prepare" \\
  -H "x-dynamic-checkout-session-token: $SESSION" \\
  -H "Content-Type: application/json" \\
  -d '{}'
# → quote.signingPayload (evmTransaction, evmApproval?, …)

# 5b. Sign with the user's wallet (off-API — viem, wagmi, Dynamic SDK).
#     If evmApproval is present, sign + broadcast it first.
TX_HASH="0x…signed-hash…"

# 5c. Notify Dynamic that the on-chain transaction is broadcast.
curl -sX POST "$SDK_BASE/transactions/$TX_ID/broadcast" \\
  -H "x-dynamic-checkout-session-token: $SESSION" \\
  -H "Content-Type: application/json" \\
  --data @- <<EOF
{ "txHash": "$TX_HASH" }
EOF
# point of no return — cannot be cancelled after this`;

  const step6 = `curl -s "$SDK_BASE/transactions/$TX_ID" \\
  -H "x-dynamic-checkout-session-token: $SESSION"
# → { executionState, settlementState, settlement: { txHash?, … }, … }`;

  return [step1, step2, step3, step4, step5, step6];
}
