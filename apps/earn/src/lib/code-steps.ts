import type { CodeStep } from "@dynamic-demos/ui";
import { highlight, type HighlightLang } from "@dynamic-demos/code-highlight";

/**
 * Integration-panel content for earn's scenario page. Snippets teach the
 * current docs APIs (@dynamic-labs-sdk 1.x + react-hooks) - the shape a
 * reader builds today - while the app internals remain on the catalog
 * 0.25.0 SDK (migration is a tracked follow-up in AGENTS.md).
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
export const EARN_SDK_STEPS: StepSource[] = [
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
    filename: "components/login.tsx",
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
    title: "Sign in with a social account",
    prose:
      "Kick off the provider's OAuth flow, then complete it when the user lands back - same session, same embedded wallet.",
    filename: "components/social-login.tsx",
    lang: "typescript",
    code: `import {
  useCompleteSocialRedirect,
  useSignInWithSocialRedirect,
} from "@dynamic-labs-sdk/react-hooks";

const { mutate: signIn } = useSignInWithSocialRedirect();
const { mutate: completeRedirect } = useCompleteSocialRedirect();

signIn({ provider: "google", redirectUrl: window.location.origin });

// ...and when the provider redirects back:
completeRedirect({ url: new URL(window.location.href) });`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/authentication-methods/social",
  },
  {
    num: "05",
    title: "Create the embedded wallet",
    prose:
      "One call mints a non-custodial embedded (WaaS) wallet for the signed-in user - no extension, no seed phrase; keys never leave Dynamic's MPC. The hook lists every account and re-renders as they're created.",
    filename: "lib/dynamic/wallets.ts",
    lang: "typescript",
    code: `import { createWaasWalletAccounts } from "@dynamic-labs-sdk/client/waas";
import { useGetWalletAccounts } from "@dynamic-labs-sdk/react-hooks";

await createWaasWalletAccounts({ chains: ["EVM"] });

const { data: walletAccounts } = useGetWalletAccounts();
const walletAccount = walletAccounts?.[0];`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/waas/creating-waas-wallet-accounts",
  },
  {
    num: "06",
    title: "Deposit USDC into a vault",
    prose:
      "Wrap the wallet account in a viem-compatible client and write to the vault contract - the user approves in place; keys never leave Dynamic's MPC.",
    filename: "lib/vaults/deposit.ts",
    lang: "typescript",
    code: `import { createWalletClientForWalletAccount } from "@dynamic-labs-sdk/evm/viem";
import { parseUnits } from "viem";

const walletClient = await createWalletClientForWalletAccount({ walletAccount });

const hash = await walletClient.writeContract({
  address: vault.address,
  abi: vaultAbi,
  functionName: "deposit",
  args: [parseUnits(amount, 6), walletAccount.address],
});`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/evm/getting-viem-wallet-client",
  },
  {
    num: "07",
    title: "Track balances and positions",
    prose:
      "Read USDC and vault-share balances with one hook - the portfolio view renders straight from the query and stays fresh.",
    filename: "components/positions.tsx",
    lang: "typescript",
    code: `import { useGetTokenBalances } from "@dynamic-labs-sdk/react-hooks";

const { data: balances } = useGetTokenBalances({ walletAccount });`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/wallets/get-token-balances",
  },
];

/** Shown while the OTP-verify screen is active (Q-017). */
export const EARN_OTP_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Verify the one-time code",
    prose:
      "The screen on the left is waiting on this call: the 6-digit code plus the verification token from the send step. On success the session is live.",
    filename: "components/otp-verify.tsx",
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
      "With the session live, one call mints the user's non-custodial embedded (WaaS) wallet - no extension, no seed phrase - and they land in the app ready to deposit.",
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
