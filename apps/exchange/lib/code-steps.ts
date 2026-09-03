import type { CodeStep } from "@dynamic-demos/ui";
import { highlight, type HighlightLang } from "@dynamic-demos/code-highlight";

/**
 * Integration-panel content for Exchange's scenario page: the five beats as the
 * SDK calls behind them. Every TypeScript snippet opens with its import line
 * (test-enforced in `__tests__/code-steps.test.ts`).
 */

export interface StepSource {
  num: string;
  title: string;
  prose: string;
  filename: string;
  lang: HighlightLang;
  code: string;
  docsUrl: string;
}

export const EXCHANGE_SDK_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Create the client",
    prose:
      "One Dynamic client per app. The EVM extension registers the embedded wallet's chains; the ZeroDev extension is what makes the sponsored transfer in beat 3 possible.",
    filename: "lib/dynamic/client.ts",
    lang: "typescript",
    code: `import { createDynamicClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { addZerodevExtension } from "@dynamic-labs-sdk/zerodev";

export const client = createDynamicClient({
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,
  autoInitialize: true,
});
addEvmExtension(client);
addZerodevExtension(client);`,
    docsUrl: "https://www.dynamic.xyz/docs/javascript/reference/client/create-dynamic-client",
  },
  {
    num: "02",
    title: "Sign in with Google, get a wallet silently",
    prose:
      "Beat 1. A social login the user already has. After the redirect completes, create the embedded EVM wallet - a 2-of-2 TSS-MPC key generated across this device and Dynamic's enclave. No seed phrase is ever shown because none exists.",
    filename: "components/sign-in-card.tsx",
    lang: "typescript",
    code: `import { authenticateWithSocial, completeSocialAuthentication, detectOAuthRedirect } from "@dynamic-labs-sdk/client";
import { createWaasWalletAccounts } from "@dynamic-labs-sdk/client/waas";

// On click:
await authenticateWithSocial({ provider: "google", redirectUrl: window.location.href });

// On return:
if (detectOAuthRedirect()) {
  await completeSocialAuthentication();
  await createWaasWalletAccounts({ chains: ["EVM"] });
}`,
    docsUrl: "https://www.dynamic.xyz/docs/javascript/authentication-methods/social",
  },
  {
    num: "03",
    title: "Read the balance the user actually holds",
    prose:
      "Beat 2. The exchange shows a USD balance, but it is the user's own USDC in a wallet only they control. The exchange holds no key material, so there is no custody position to license or to put on the balance sheet.",
    filename: "lib/dynamic/evm.ts",
    lang: "typescript",
    code: `import { getWalletAccounts } from "@dynamic-labs-sdk/client";
import { createPublicClient, erc20Abi, http } from "viem";
import { sepolia } from "viem/chains";

const [wallet] = getWalletAccounts();
const publicClient = createPublicClient({ chain: sepolia, transport: http() });
const usdc = await publicClient.readContract({
  address: USDC_SEPOLIA,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [wallet.address],
});`,
    docsUrl: "https://www.dynamic.xyz/docs/javascript/reference/wallets/get-wallet-accounts",
  },
  {
    num: "04",
    title: "Send with zero ETH: sponsor the network fee",
    prose:
      "Beat 3. The user holds no native token and will not buy any for a first transaction. With gas sponsorship enabled on the environment (Enterprise tier, provisioned by Dynamic), one call routes the transfer through Dynamic's native 7702 relayer: the SDK signs the one-time EIP-7702 delegation itself and the relayer pays the fee.",
    filename: "lib/dynamic/evm.ts",
    lang: "typescript",
    code: `import { isEvmGasSponsorshipEnabled, sendSponsoredTransaction } from "@dynamic-labs-sdk/evm";

if (isEvmGasSponsorshipEnabled()) {
  const { transactionHash } = await sendSponsoredTransaction({
    walletAccount,
    calls: [{ target: USDC_SEPOLIA, data: transferCalldata, value: 0n }],
  });
}`,
    docsUrl: "https://www.dynamic.xyz/docs/javascript/reference/evm/evm-gas-sponsorship",
  },
  {
    num: "05",
    title: "Lose the device, keep the wallet",
    prose:
      "Beat 4. The client share is backed up encrypted; a fresh sign-in on a new device restores it through the Encryption Proxy and refreshes the 2-of-2 with the enclave. Nobody types twelve words and the exchange never held a key. An optional cloud copy makes it 2-of-3.",
    filename: "lib/dynamic/backup.ts",
    lang: "typescript",
    code: `import { getGoogleDriveBackupReadiness } from "@dynamic-labs-sdk/client";
import { backupWaasKeySharesToGoogleDrive } from "@dynamic-labs-sdk/client/waas";

// Optional 2-of-3: a second encrypted copy in the user's own Drive.
const readiness = await getGoogleDriveBackupReadiness();
if (readiness.status === "ready") {
  await backupWaasKeySharesToGoogleDrive({ walletAccount });
}
// Recovery itself needs no code: sign in on the new device and the
// client share is restored from the encrypted backup.`,
    docsUrl: "https://www.dynamic.xyz/docs/javascript/wallets/embedded-wallets/mpc/google-drive-backup",
  },
  {
    num: "06",
    title: "Show who holds what",
    prose:
      "Beat 5. The architecture view is drawn from the live wallet: the credential's key-share records say where each client share is backed up and which threshold scheme the wallet uses. Two shares, two places, never combined.",
    filename: "components/architecture/architecture-view.tsx",
    lang: "typescript",
    code: `import { getWalletAccounts } from "@dynamic-labs-sdk/client";

const [wallet] = getWalletAccounts();
const credential = client.user?.verifiedCredentials.find((c) => c.id === wallet.verifiedCredentialId);
const { keyShares, thresholdSignatureScheme } = credential.walletProperties;
// keyShares[].backupLocation -> "dynamic" | "googleDrive" | ...
// thresholdSignatureScheme  -> "TWO_OF_TWO"`,
    docsUrl: "https://www.dynamic.xyz/docs/javascript/wallets/embedded-wallets/mpc/architecture",
  },
];

export async function buildCodeSteps(sources: StepSource[]): Promise<CodeStep[]> {
  return Promise.all(
    sources.map(async ({ lang, code, ...rest }) => ({
      ...rest,
      rawCode: code,
      html: await highlight(code, lang),
    })),
  );
}
