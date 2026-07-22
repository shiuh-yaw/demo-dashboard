import type { CodeStep } from "@dynamic-demos/ui";
import { highlight, type HighlightLang } from "@dynamic-demos/code-highlight";

/**
 * Integration-panel content for remittance's scenario page. Snippets teach
 * the current docs APIs (@dynamic-labs-sdk 1.x + react-hooks) - the shape a
 * reader builds today - while the app internals remain on the catalog SDK
 * plus ZeroDev (migration to native EIP-7702 sponsorship is a tracked
 * follow-up in AGENTS.md).
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

/** Full journey - default panel. */
export const REMITTANCE_SDK_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Create the client",
    prose:
      "One Dynamic client per app, created at module scope. The EVM extension registers the networks the embedded wallet supports.",
    filename: "lib/dynamic/client.ts",
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
    title: "Wrap your app for hooks",
    prose:
      "The react-hooks package reads the client from context and uses TanStack Query under the hood, so mount QueryClientProvider outside DynamicProvider once - every hook below works anywhere inside.",
    filename: "app/providers.tsx",
    lang: "tsx",
    code: `import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicProvider } from "@dynamic-labs-sdk/react-hooks";
import { client } from "@/lib/dynamic/client";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DynamicProvider client={client}>{children}</DynamicProvider>
    </QueryClientProvider>
  );
}`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/react-hooks#setup",
  },
  {
    num: "03",
    title: "Sign in with an email code",
    prose:
      "The login card on the left runs this flow: send a one-time passcode, verify it. No password, no seed phrase - the session lives in the client.",
    filename: "components/login-page.tsx",
    lang: "typescript",
    code: `import { useSendEmailOTP, useVerifyOTP } from "@dynamic-labs-sdk/react-hooks";

const { mutate: sendOtp, data: otpVerification } = useSendEmailOTP();
const { mutate: verifyOtp } = useVerifyOTP();

sendOtp({ email });
// User types the 6-digit code from their inbox:
verifyOtp({ otp: code, otpVerification });`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/authentication-methods/email",
  },
  {
    num: "04",
    title: "An embedded wallet, gas paid for",
    prose:
      "Signing in mints a non-custodial embedded (WaaS) wallet - no extension, no seed phrase; keys never leave Dynamic's MPC. Every payout below rides that same wallet with EIP-7702 gas sponsorship: flip the dashboard toggle and call one function - the app pays the network fee, the sender never touches ETH.",
    filename: "lib/transactions/send-usdc-transaction.ts",
    lang: "typescript",
    code: `import { createWaasWalletAccounts } from "@dynamic-labs-sdk/client/waas";
import { sendSponsoredTransaction } from "@dynamic-labs-sdk/evm";
import { encodeFunctionData, erc20Abi, parseUnits } from "viem";
import { USDC_CONTRACT_ADDRESS, USDC_DECIMALS } from "@/lib/constants";

await createWaasWalletAccounts({ chains: ["EVM"] });

const { transactionHash } = await sendSponsoredTransaction({
  walletAccount,
  calls: [
    {
      target: USDC_CONTRACT_ADDRESS,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipient, parseUnits(amount, USDC_DECIMALS)],
      }),
      value: 0n,
    },
  ],
});`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/evm/evm-gas-sponsorship",
  },
  {
    num: "05",
    title: "Balances + transfer history",
    prose:
      "Balances and transfer history each come from one hook - the wallet page renders the asset list and recent-activity feed straight from these queries, refetched as the wallet changes. This demo also runs a server-side Alchemy proxy for networks the hosted balances backend doesn't cover yet - same rule either way: the API key stays server-side, the client only ever calls your own route.",
    filename: "components/screens/tx-history-screen.tsx",
    lang: "typescript",
    code: `import {
  useGetTokenBalances,
  useGetTransactionHistory,
} from "@dynamic-labs-sdk/react-hooks";

const { data: balances } = useGetTokenBalances({ walletAccount, includeNative: true });

const { data: history } = useGetTransactionHistory({
  address: walletAccount.address,
  chain: "EVM",
  networkId,
  limit: 10,
});
// history.transactions renders the list; pass history.nextOffset back to page.`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/wallets/get-transaction-history",
  },
];

/** Shown while the OTP-verify screen is active. */
export const REMITTANCE_OTP_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Verify the one-time code",
    prose:
      "The screen on the left is waiting on this call: the 6-digit code plus the verification token from the send step. On success the session is live.",
    filename: "components/screens/otp-verify-screen.tsx",
    lang: "typescript",
    code: `import { useVerifyOTP } from "@dynamic-labs-sdk/react-hooks";

const { mutate: verifyOtp, isPending } = useVerifyOTP();

verifyOtp({ otp: code, otpVerification });`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/authentication-methods/email",
  },
  {
    num: "02",
    title: "Then create the embedded wallet",
    prose:
      "With the session live, one call mints the user's non-custodial embedded (WaaS) wallet - no extension, no seed phrase - and they land in the app ready to send.",
    filename: "lib/dynamic/wallets.ts",
    lang: "typescript",
    code: `import { createWaasWalletAccounts } from "@dynamic-labs-sdk/client/waas";

await createWaasWalletAccounts({ chains: ["EVM"] });`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/waas/creating-waas-wallet-accounts",
  },
];

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
