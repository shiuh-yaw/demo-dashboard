/**
 * Code-panel props builder for the /kyc-deposit scenario.
 *
 * Unlike the Fireblocks Flow scenarios (checkout/deposit/withdraw) which
 * share a 5-step SDK lifecycle, the KYC deposit flow has its own
 * integration shape: connectAndVerify → SumSub KYC → deposit-address
 * provisioning → settlement monitoring.
 *
 * The code examples reflect what an integrator would write: Dynamic SDK
 * wallet verification, SumSub WebSDK token generation, deposit address
 * provisioning via dashboard, and settlement status polling.
 */

import { highlight } from "./code-highlight";
import { WEBHOOK_DOCS_URL, WEBHOOK_EVENTS, WEBHOOK_HANDLER_CODE } from "./flow-helpers";
import type {
  CodePanelProps,
  CodeStep,
  WebhookEventCard,
  WebhookHandlerCard,
} from "@/components/code-panel";

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

interface KycStepDef {
  num: string;
  title: string;
  prose: string;
  sdkFile: string;
  apiFile: string;
  sdkCode: string;
  apiCode: string;
}

const KYC_DEPOSIT_STEPS: KycStepDef[] = [
  {
    num: "01",
    title: "Connect & verify wallet",
    prose:
      "Client-side. The user connects their wallet and signs a message (SIWE-style) to prove ownership. Uses `connectAndVerifyWithWalletProvider` from the Dynamic SDK — this returns the connected wallet reference and a verified session.",
    sdkFile: "connect.ts",
    apiFile: "connect.sh",
    sdkCode: `import { createDynamicClient } from "@dynamic-labs-sdk/client";
import { createEvmExtension } from "@dynamic-labs-sdk/evm";

const client = createDynamicClient({
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,
  chains: [createEvmExtension()],
});

// Connect and verify — user signs a message proving ownership
const wallet = await client.auth.connectAndVerifyWithWalletProvider({
  walletProvider: "metamask", // or any EVM wallet
});

console.log("Verified wallet:", wallet.address);`,
    apiCode: `# Client-side only — no REST equivalent.
# The Dynamic JS SDK handles wallet connection + SIWE signing
# in the browser. The server receives the verified session
# via the JWT cookie sync.

# After wallet is connected, extract the address:
WALLET_ADDRESS="0xUSER_WALLET_ADDRESS"`,
  },
  {
    num: "02",
    title: "Initialize SumSub KYC",
    prose:
      "Server-side token generation + client-side WebSDK launch. Your server creates a SumSub applicant and generates an access token; the client loads the SumSub WebSDK with that token. On completion, a webhook notifies your backend of the verification result.",
    sdkFile: "kyc-init.server.ts",
    apiFile: "kyc-init.sh",
    sdkCode: `// Server: generate SumSub access token for the user
import { createSumsubClient } from "@dynamic-demos/sumsub";

const sumsub = createSumsubClient({
  appToken: process.env.SUMSUB_APP_TOKEN!,
  secretKey: process.env.SUMSUB_SECRET_KEY!,
  env: "sandbox",
});

const applicant = await sumsub.createApplicant({
  externalUserId: wallet.address,
  levelName: "basic-kyc-level",
});

const { token } = await sumsub.generateAccessToken({
  userId: applicant.id,
  levelName: "basic-kyc-level",
});

// Return \`token\` to the client for WebSDK init`,
    apiCode: `# Create applicant
curl -X POST https://your-dashboard.com/api/sumsub/applicants \\
  -H "Content-Type: application/json" \\
  -d '{
    "externalUserId": "'$WALLET_ADDRESS'",
    "levelName": "basic-kyc-level"
  }'

# Generate SDK access token
curl -X POST https://your-dashboard.com/api/sumsub/access-token \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "'$APPLICANT_ID'",
    "levelName": "basic-kyc-level"
  }'`,
  },
  {
    num: "03",
    title: "Check verification status",
    prose:
      "Poll or webhook. After the user completes the SumSub WebSDK flow, verify the result server-side before provisioning the deposit address. Production should rely on the `applicantReviewed` webhook; the polling approach works for demos.",
    sdkFile: "kyc-status.server.ts",
    apiFile: "kyc-status.sh",
    sdkCode: `// Server: check applicant verification status
const status = await sumsub.getApplicantStatus(applicantId);

if (status.reviewResult?.reviewAnswer === "GREEN") {
  // User is verified — proceed to deposit address provisioning
  console.log("KYC approved:", applicantId);
} else if (status.reviewResult?.reviewAnswer === "RED") {
  // Verification failed
  throw new Error("KYC verification denied");
} else {
  // Still pending — retry after delay or wait for webhook
  console.log("KYC pending, current status:", status.reviewStatus);
}`,
    apiCode: `# Check applicant status
curl -X GET "https://your-dashboard.com/api/sumsub/applicants/$APPLICANT_ID/status" \\
  -H "Content-Type: application/json"

# Response:
# {
#   "reviewStatus": "completed",
#   "reviewResult": { "reviewAnswer": "GREEN" }
# }`,
  },
  {
    num: "04",
    title: "Provision deposit address",
    prose:
      "Server-side. Once KYC passes, provision a dedicated deposit address for the user. The address is tied to their identity — all deposits to this address are credited to their account and automatically off-ramped to the merchant's bank.",
    sdkFile: "deposit-address.server.ts",
    apiFile: "deposit-address.sh",
    sdkCode: `// Server: provision a hosted wallet / deposit address
const response = await fetch(
  \`\${DASHBOARD_API_URL}/api/iron/deposit-address\`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      walletAddress: wallet.address,
    }),
  },
);

const { depositAddress, customerId } = await response.json();
// Return depositAddress to the client — user sends USDC here
console.log("Deposit to:", depositAddress);`,
    apiCode: `# Provision deposit address (via dashboard)
curl -X POST https://your-dashboard.com/api/iron/deposit-address \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "walletAddress": "'$WALLET_ADDRESS'"
  }'

# Response:
# {
#   "depositAddress": "0xABC...123",
#   "customerId": "cust_xxx",
#   "blockchain": "BASE_SEPOLIA"
# }`,
  },
  {
    num: "05",
    title: "Monitor settlement",
    prose:
      "After the user sends USDC to the deposit address, the off-ramp converts it to fiat and settles to the merchant's bank account. Monitor the settlement status via polling or webhooks. Terminal states: `settled` (funds in bank) or `failed` (requires retry).",
    sdkFile: "settlement.server.ts",
    apiFile: "settlement.sh",
    sdkCode: `// Server: poll settlement status
async function checkSettlement(customerId: string) {
  const res = await fetch(
    \`\${DASHBOARD_API_URL}/api/iron/settlements/\${customerId}\`,
  );
  const { status, fiatAmount, currency } = await res.json();

  switch (status) {
    case "confirming":
      // USDC deposit detected, awaiting confirmations
      break;
    case "converting":
      // Converting USDC → fiat via off-ramp
      break;
    case "settled":
      // Fiat deposited to merchant bank account
      console.log(\`Settled: \${fiatAmount} \${currency}\`);
      break;
    case "failed":
      // Settlement failed — surface retry
      break;
  }
}`,
    apiCode: `# Check settlement status
curl -X GET "https://your-dashboard.com/api/iron/settlements/$CUSTOMER_ID" \\
  -H "Content-Type: application/json"

# Response:
# {
#   "status": "settled",
#   "fiatAmount": "99.85",
#   "currency": "USD",
#   "settledAt": "2025-01-15T10:30:00Z"
# }`,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KYC_DEPOSIT_HELPERS = [
  {
    id: "connect-and-verify",
    sig: ["connectAndVerifyWithWalletProvider", "(options)"] as [string, string],
    tag: "Auth",
    desc: "Connect an external wallet and verify ownership via SIWE. Returns a `Wallet` reference with the verified `address`.",
    rawCode: `const wallet = await client.auth.connectAndVerifyWithWalletProvider({
  walletProvider: "metamask",
});
// wallet.address → "0x..."`,
    docsUrl: "https://www.dynamic.xyz/docs/javascript/reference/client/connect-and-verify",
  },
  {
    id: "sumsub-websdk",
    sig: ["snsWebSdk.init", "(accessToken, handler)"] as [string, string],
    tag: "KYC",
    desc: "Initialize the SumSub WebSDK in the browser. The access token is generated server-side; the handler receives lifecycle events (`onApproved`, `onError`).",
    rawCode: `// Load SumSub WebSDK (script tag or npm)
const sdk = window.snsWebSdkInstance
  .init(accessToken, () => refreshToken())
  .withConf({ lang: "en" })
  .on("onApproved", () => handleApproved())
  .on("onError", (err) => handleError(err))
  .build();

sdk.launch("#sumsub-container");`,
    docsUrl: "https://docs.sumsub.com/docs/web-sdk-overview",
  },
  {
    id: "generate-share-token",
    sig: ["generateShareToken", "(applicantId)"] as [string, string],
    tag: "KYC",
    desc: "Generate a single-use share token for reliance KYC. Used to pass verified identity to the off-ramp provider without re-verification.",
    rawCode: `import { createSumsubClient } from "@dynamic-demos/sumsub";

const sumsub = createSumsubClient({ appToken, secretKey, env: "sandbox" });

// Generate share token after KYC approval
const { token } = await sumsub.generateShareToken({
  applicantId: "app_abc123",
});
// Pass token to off-ramp provider for identity reuse`,
    docsUrl: "https://docs.sumsub.com/docs/share-tokens",
  },
];

const KYC_DEPOSIT_AI: {
  eyebrow: string;
  title: string;
  sub: string;
  rawPrompt: string;
} = {
  eyebrow: "AI SCAFFOLD",
  title: "Build a KYC-gated deposit flow",
  sub: "Paste this into your AI assistant to scaffold a full KYC → deposit → settlement integration.",
  rawPrompt: `Build a KYC-gated crypto deposit flow with these requirements:

1. Wallet connection: Use Dynamic SDK \`connectAndVerifyWithWalletProvider\` for SIWE-style wallet verification.
2. Identity verification: Integrate SumSub WebSDK for KYC. Server generates access tokens via the SumSub API.
3. Deposit address: After KYC approval, provision a dedicated deposit address per user. Deposits to this address trigger off-ramp settlement.
4. Settlement: Monitor USDC → fiat conversion status (confirming → converting → settled).

Stack: Next.js (App Router), Dynamic SDK for auth, SumSub for KYC, USDC on Base Sepolia (testnet).
Architecture: Demo app calls dashboard API for provider operations (apps don't hold provider secrets directly).`,
};

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export async function buildKycDepositCodePanelProps(): Promise<CodePanelProps> {
  const sdkCodes = KYC_DEPOSIT_STEPS.map((s) => s.sdkCode);
  const apiCodes = KYC_DEPOSIT_STEPS.map((s) => s.apiCode);

  const [sdkHtmls, apiHtmls, helperHtmls, webhookHandlerHtml, webhookEventHtmls] =
    await Promise.all([
      Promise.all(sdkCodes.map((code) => highlight(code, "typescript"))),
      Promise.all(apiCodes.map((code) => highlight(code, "bash"))),
      Promise.all(KYC_DEPOSIT_HELPERS.map((h) => highlight(h.rawCode, "typescript"))),
      highlight(WEBHOOK_HANDLER_CODE, "typescript"),
      Promise.all(WEBHOOK_EVENTS.map((e) => highlight(e.rawPayload, "json"))),
    ]);

  const sdkSteps: CodeStep[] = KYC_DEPOSIT_STEPS.map((def, i) => ({
    num: def.num,
    title: def.title,
    prose: def.prose,
    filename: def.sdkFile,
    rawCode: sdkCodes[i]!,
    html: sdkHtmls[i]!,
    docsUrl:
      i === 0
        ? "https://www.dynamic.xyz/docs/javascript/reference/client/connect-and-verify"
        : i === 1
          ? "https://docs.sumsub.com/docs/web-sdk-overview"
          : i === 2
            ? "https://docs.sumsub.com/reference/get-applicant-status"
            : "https://www.dynamic.xyz/docs/overview/deposit-with-crypto",
  }));

  const apiSteps: CodeStep[] = KYC_DEPOSIT_STEPS.map((def, i) => ({
    num: def.num,
    title: def.title,
    prose: def.prose,
    filename: def.apiFile,
    rawCode: apiCodes[i]!,
    html: apiHtmls[i]!,
    docsUrl:
      i === 0
        ? "https://www.dynamic.xyz/docs/javascript/reference/client/connect-and-verify"
        : i === 1
          ? "https://docs.sumsub.com/reference/authentication"
          : i === 2
            ? "https://docs.sumsub.com/reference/get-applicant-status"
            : "https://www.dynamic.xyz/docs/overview/deposit-with-crypto",
  }));

  const helpers = KYC_DEPOSIT_HELPERS.map((h, i) => ({
    ...h,
    html: helperHtmls[i]!,
  }));

  const webhookHandler: WebhookHandlerCard = {
    rawCode: WEBHOOK_HANDLER_CODE,
    html: webhookHandlerHtml,
  };

  const webhookEvents: WebhookEventCard[] = WEBHOOK_EVENTS.map((e, i) => ({
    ...e,
    html: webhookEventHtmls[i]!,
  }));

  return {
    sdkSteps,
    apiSteps,
    helpers,
    ai: KYC_DEPOSIT_AI,
    webhookHandler,
    webhookEvents,
    webhookDocsUrl: WEBHOOK_DOCS_URL,
  };
}
