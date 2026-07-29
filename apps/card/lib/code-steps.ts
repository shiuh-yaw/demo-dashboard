import type { CodeStep } from "@dynamic-demos/ui";
import { highlight, type HighlightLang } from "@dynamic-demos/code-highlight";

/**
 * Integration-panel content for the card scenario page - the real two-provider
 * story: Dynamic supplies the embedded wallet + gasless funding (client-side),
 * Rain's issuing API issues and runs the card (server-side, behind the
 * `Api-Key` that never reaches the browser). Snippets show the actual Rain
 * endpoints (`/v1/issuing/...`), not the app's internal proxy routes. Keep in
 * sync with `apps/dashboard/src/app/api/rain/*` + `packages/rain` if the Rain
 * surface changes.
 */

export interface StepSource {
  num: string;
  title: string;
  prose: string;
  filename: string;
  lang: HighlightLang;
  code: string;
  /** Optional "Docs →" link; omitted on the Rain steps (no per-step doc). */
  docsUrl?: string;
}

export const CARD_SDK_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Create the wallet",
    prose:
      "One Dynamic client per app. The EVM extension gives every user an embedded wallet - the card's funding source and the signer for gasless transfers.",
    filename: "lib/dynamic-client.ts",
    lang: "typescript",
    code: `import { createDynamicClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";

export const client = createDynamicClient({
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,
});
addEvmExtension(client);`,
    docsUrl: "https://www.dynamic.xyz/docs/overview/wallets/overview",
  },
  {
    num: "02",
    title: "Issue the card",
    prose:
      "On your server - the Rain Api-Key never touches the browser. Submit the KYC application for a userId, then issue a virtual card for that user.",
    filename: "server/issue-card.ts",
    lang: "typescript",
    code: `const RAIN = "https://api-dev.raincards.xyz/v1/issuing";
const auth = {
  "Api-Key": process.env.RAIN_API_KEY!,
  "Content-Type": "application/json",
};

// POST /v1/issuing/applications/user  ->  KYC, returns the Rain userId
const { userId } = await fetch(\`\${RAIN}/applications/user\`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify(application),
}).then((r) => r.json());

// POST /v1/issuing/users/:userId/cards  ->  the virtual card
const card = await fetch(\`\${RAIN}/users/\${userId}/cards\`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ type: "virtual" }),
}).then((r) => r.json());`,
  },
  {
    num: "03",
    title: "Reveal card details",
    prose:
      "The plaintext PAN/CVC never touch your server. The browser mints an AES key and passes its SessionId; Rain returns the secrets ENCRYPTED, your server relays them, and the browser decrypts locally.",
    filename: "server/card-secrets.ts",
    lang: "typescript",
    code: `// GET /v1/issuing/cards/:cardId/secrets   (SessionId = the browser's key)
const encrypted = await fetch(\`\${RAIN}/cards/\${cardId}/secrets\`, {
  headers: { "Api-Key": process.env.RAIN_API_KEY!, SessionId: sessionId },
}).then((r) => r.json());

// Relay \`encrypted\` to the browser, which decrypts with its own key.
const pan = await decryptSecret(encrypted.encryptedPan, secretKey);
const cvc = await decryptSecret(encrypted.encryptedCvc, secretKey);`,
  },
  {
    num: "04",
    title: "Read the balance",
    prose:
      "Spending power comes straight from Rain, keyed by the userId. Read it on your server and surface it to the UI.",
    filename: "server/balance.ts",
    lang: "typescript",
    code: `// GET /v1/issuing/users/:userId/balances
const balance = await fetch(\`\${RAIN}/users/\${userId}/balances\`, {
  headers: { "Api-Key": process.env.RAIN_API_KEY! },
}).then((r) => r.json());

balance.spendingPower; // what the card can spend right now`,
  },
  {
    num: "05",
    title: "Get the deposit address",
    prose:
      "Each user has a per-chain Rain deposit contract; stablecoins sent to it fund the card. Fetch it (or create it once) for the funding chain.",
    filename: "server/deposit-address.ts",
    lang: "typescript",
    code: `// GET /v1/issuing/users/:userId/contracts
// (POST the same path with { chainId } to create one the first time)
const contracts = await fetch(\`\${RAIN}/users/\${userId}/contracts\`, {
  headers: { "Api-Key": process.env.RAIN_API_KEY! },
}).then((r) => r.json());

const depositAddress = contracts.find(
  (c) => c.chainId === 84532, // Base Sepolia
)?.depositAddress;`,
  },
  {
    num: "06",
    title: "Fund it gaslessly",
    prose:
      "Back in the browser: a sponsored stablecoin transfer from the user's embedded wallet to that Rain deposit address - EIP-7702, no native gas, no approval popups.",
    filename: "hooks/use-fund-card.ts",
    lang: "tsx",
    code: `import { sendSponsoredTransaction } from "@dynamic-labs-sdk/evm";

const { transactionHash } = await sendSponsoredTransaction({
  walletAccount,
  calls: [
    {
      target: USDC_ADDRESS,
      data: encodeTransfer(depositAddress, amount),
    },
  ],
});`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/evm/transactions/gas-sponsorship",
  },
];

/** Highlight every snippet server-side into the shared `CodeStep` shape. */
export async function buildCodeSteps(
  sources: StepSource[],
): Promise<CodeStep[]> {
  return Promise.all(
    sources.map(async ({ lang, code, ...rest }) => ({
      ...rest,
      rawCode: code,
      html: await highlight(code, lang),
    })),
  );
}
