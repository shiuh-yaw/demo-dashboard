/**
 * Shared SDK + REST snippet generators for the Flow walkthrough panels.
 *
 * Each scenario page (`/checkout`, `/deposit`, `/withdraw`) renders a
 * 5-step walkthrough — the underlying API calls are identical across
 * scenarios; only `mode`, the `destinations[]` identifier, the source
 * actor label, and the surrounding prose differ. The prose lives in
 * each page's `STEP_DEFS`; the actual code samples are produced here
 * so the page bodies stay short.
 */

import type { ParsedFlowConfig } from "./flow-config/schema";
import { findTokenByAssetChain } from "./tokens";

export type StepTuple = [string, string, string, string, string];

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
  // 01 — Create the flow (server-side; no client SDK helper).
  "https://www.dynamic.xyz/docs/javascript/reference/flow-getting-started",
  // 02 — attachFlowSource
  "https://www.dynamic.xyz/docs/javascript/reference/client/attach-flow-source",
  // 03 — getFlowQuote
  "https://www.dynamic.xyz/docs/javascript/reference/client/get-flow-quote",
  // 04 — submitFlowTransaction (prepare + sign + broadcast)
  "https://www.dynamic.xyz/docs/javascript/reference/client/submit-flow-transaction",
  // 05 — getFlow (read status)
  "https://www.dynamic.xyz/docs/javascript/reference/client/get-flow",
];

export const STEP_API_DOCS_URLS: readonly string[] = [
  // 01–05 — Fireblocks Flow API guide (create → attach → quote → submit → poll).
  "https://www.dynamic.xyz/docs/overview/fireblocks-flow-api",
  "https://www.dynamic.xyz/docs/overview/fireblocks-flow-api",
  "https://www.dynamic.xyz/docs/overview/fireblocks-flow-api",
  "https://www.dynamic.xyz/docs/overview/fireblocks-flow-api",
  "https://www.dynamic.xyz/docs/overview/fireblocks-flow-api",
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

/** Map scenario intent to the Flow API `mode` path segment. */
function flowModePath(mode: string): "payment" | "deposit" | "withdraw" {
  if (mode === "withdraw") return "withdraw";
  if (mode === "deposit") return "deposit";
  return "payment";
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
  const flowMode = flowModePath(mode);

  // Step 01 — server-side flow creation (amount + settlement + destination).
  const step1 = `// Runs on your server — one Flow per payment/deposit/withdraw.
// Requires an API token with flow.write scope.
const res = await fetch(
  \`https://app.dynamic.xyz/api/v0/server/\${process.env.ENV_ID}/flow/${flowMode}\`,
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.DYNAMIC_API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: "5.00",
      currency: "USD",
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
const { flow } = await res.json();
const flowId = flow.id;
// Pass flowId to your frontend.`;

  const step2 = `import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { attachFlowSource } from "@dynamic-labs-sdk/client";

addEvmExtension();

// Declare the payer's wallet + chain. Returns an updated flow and
// stores a session token (dft_…) for subsequent calls automatically.
await attachFlowSource({
  flowId,
  fromAddress: wallet.address,
  fromChainId: String(fromChainId), // from the picked token — not getActiveNetworkData()
  fromChainName: wallet.chain,
  sourceType: "wallet",
});
// 403 → source blocked by risk/sanctions screening.`;

  const step3 = `import { getFlowQuote } from "@dynamic-labs-sdk/client";

const quoted = await getFlowQuote({
  flowId,
  fromTokenAddress: fromToken.address,
  fromChainId: String(fromToken.networkId),
  slippage: 0.005, // 0.5%
});
// quoted.quote.expiresAt — re-quote if the user takes longer than 60s.`;

  const step4 = `import { submitFlowTransaction } from "@dynamic-labs-sdk/client";

// prepare → sign (wallet popup) → broadcast in one helper.
await submitFlowTransaction({
  flowId,
  walletAccount: wallet,
});`;

  const step5 = `import { getFlow } from "@dynamic-labs-sdk/client";

const flow = await getFlow({ flowId });

// flow.executionState — lifecycle phase (e.g. "source_confirmed", "failed")
// flow.settlementState  — "none" | "completed" | "failed"
// flow.settlement       — { txHash?, … } once settled`;

  return [step1, step2, step3, step4, step5];
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
  const flowMode = flowModePath(mode);

  const step1 = `ENV_ID="your-environment-id"
SERVER_BASE="https://app.dynamic.xyz/api/v0/server/$ENV_ID"

# Server-side — requires DYNAMIC_API_KEY with flow.write scope.
FLOW=$(curl -sX POST "$SERVER_BASE/flow/${flowMode}" \\
  -H "Authorization: Bearer $DYNAMIC_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "5.00",
    "currency": "USD",
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
FLOW_ID=$(echo "$FLOW" | jq -r .flow.id)
# → flow.id (UUID)`;

  const step2 = `# Prerequisites: FLOW_ID (step 01)

ENV_ID="your-environment-id"
SDK_BASE="https://app.dynamic.xyz/api/v0/sdk/$ENV_ID"

# No session token yet — attach returns one (dft_…).
RESP=$(curl -sX POST "$SDK_BASE/flow/$FLOW_ID/source" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sourceType": "wallet",
    "fromAddress": "${sourceFromAddress}",
    "fromChainId": "${chainId}",
    "fromChainName": "${chainName}"
  }')
SESSION=$(echo "$RESP" | jq -r .sessionToken)
# → executionState: "source_attached"
# 403 → blocked by risk/sanctions screening`;

  const step3 = `# Prerequisites: FLOW_ID (step 01), SESSION (step 02)

ENV_ID="your-environment-id"
SDK_BASE="https://app.dynamic.xyz/api/v0/sdk/$ENV_ID"

curl -sX POST "$SDK_BASE/flow/$FLOW_ID/quote" \\
  -H "x-dynamic-flow-session-token: $SESSION" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fromTokenAddress": "${nativeTokenAddress}",
    "fromChainId": "${chainId}",
    "slippage": 0.005
  }'
# → quote.fromAmount, quote.toAmount, quote.fees, quote.expiresAt (60s)`;

  const step4 = `# Prerequisites: FLOW_ID (step 01), SESSION (step 02)

ENV_ID="your-environment-id"
SDK_BASE="https://app.dynamic.xyz/api/v0/sdk/$ENV_ID"

# 4a. Prepare the signing payload.
curl -sX POST "$SDK_BASE/flow/$FLOW_ID/prepare" \\
  -H "x-dynamic-flow-session-token: $SESSION" \\
  -H "Content-Type: application/json" \\
  -d '{}'
# → quote.signingPayload (evmTransaction, evmApproval?, …)

# 4b. Sign with the user's wallet (off-API — viem, wagmi, Dynamic SDK).
#     If evmApproval is present, sign + broadcast it first.
TX_HASH="0x…signed-hash…"

# 4c. Notify Dynamic that the on-chain transaction is broadcast.
curl -sX POST "$SDK_BASE/flow/$FLOW_ID/broadcast" \\
  -H "x-dynamic-flow-session-token: $SESSION" \\
  -H "Content-Type: application/json" \\
  --data @- <<EOF
{ "txHash": "$TX_HASH" }
EOF
# → point of no return — cannot be cancelled after this`;

  const step5 = `# Prerequisites: FLOW_ID (step 01), SESSION (step 02)

ENV_ID="your-environment-id"
SDK_BASE="https://app.dynamic.xyz/api/v0/sdk/$ENV_ID"

curl -s "$SDK_BASE/flow/$FLOW_ID" \\
  -H "x-dynamic-flow-session-token: $SESSION"
# → executionState, settlementState, settlement: { txHash?, … }`;

  return [step1, step2, step3, step4, step5];
}
