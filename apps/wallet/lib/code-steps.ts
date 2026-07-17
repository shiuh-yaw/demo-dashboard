import type { CodeStep } from "@dynamic-demos/ui";
import { highlight, type HighlightLang } from "./code-highlight";
import type { SendChain } from "./send-chains";

/**
 * Integration-panel content for wallet's scenario page. Each snippet
 * mirrors the live implementation (file named in `filename`); if the
 * wallet code changes, update the matching snippet in the same PR.
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

export const WALLET_SDK_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Create the client",
    prose:
      "One Dynamic client per app, created at module scope. Chain extensions register which networks the embedded wallet supports.",
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
      "Send a one-time passcode and verify it. No password, no seed phrase - the session lives in the client.",
    filename: "components/email-login.tsx",
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
];

/**
 * Bring Your Own Auth steps - shown in the panel while the
 * `jwt-generator` screen is active (Q-017 slice 1). Unlike the SDK
 * steps, these are deliberately generic: they teach how a reader wires
 * their own auth provider into Dynamic, not how this demo's dev
 * tooling works (the generator card plays the auth-provider role).
 */
export const WALLET_JWT_SETUP_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Prerequisite: register your provider with Dynamic",
    prose:
      "One-time setup. In the Dynamic dashboard under Developer → External Authentication, point Dynamic at your issuer and JWKS URL, then enable the toggle. The dashboard can test a JWT against your settings. Bring Your Own Auth is an enterprise feature - contact Dynamic to enable it.",
    filename: "app.dynamic.xyz → External Authentication",
    lang: "bash",
    code: `iss:     https://auth.your-app.com   # must match your JWT's iss claim
jwksUrl: https://auth.your-app.com/.well-known/jwks.json
aud:     (optional)`,
    docsUrl:
      "https://www.dynamic.xyz/docs/overview/authentication/bring-your-own-auth#configuration",
  },
  {
    num: "02",
    title: "Issue a JWT from your auth provider",
    prose:
      "Already have auth (Auth0, Firebase, Supabase, or your own backend)? Keep it. Issue a Dynamic-specific JWT - separate from your app's access token - with `iss`, `sub`, and `exp` claims. Include a verified `email` and Dynamic attaches an email credential too.",
    filename: "your-auth-server/dynamic-jwt.ts",
    lang: "typescript",
    code: `import { SignJWT } from "jose";

const jwt = await new SignJWT({ email, emailVerified: true })
  .setProtectedHeader({ alg: "RS256", kid })
  .setIssuer("https://auth.your-app.com")
  .setSubject(user.id)
  .setExpirationTime("1h")
  .sign(privateKey);`,
    docsUrl:
      "https://www.dynamic.xyz/docs/overview/authentication/bring-your-own-auth#how-authentication-is-performed-client-%2F-end-user--dynamic",
  },
  {
    num: "03",
    title: "Publish your signing keys as JWKS",
    prose:
      "Dynamic verifies every token against the public JWKS endpoint you registered. Most auth providers already expose one; if you sign your own tokens, serve the public key at a stable URL.",
    filename: "GET /.well-known/jwks.json",
    lang: "typescript",
    code: `import { exportJWK } from "jose";

const jwk = await exportJWK(publicKey);

return Response.json({
  keys: [{ ...jwk, kid, alg: "RS256", use: "sig" }],
});`,
    docsUrl:
      "https://www.dynamic.xyz/docs/overview/authentication/bring-your-own-auth#configuration",
  },
  {
    num: "04",
    title: "Exchange the JWT for a Dynamic session",
    prose:
      "After your normal login, hand the token to the SDK. Dynamic verifies the signature against your JWKS, validates the claims, and creates the session + embedded wallet - the user behaves like any other Dynamic user from here.",
    filename: "your-app/sign-in.tsx",
    lang: "typescript",
    code: `import { useSignInWithExternalJwt } from "@dynamic-labs-sdk/react-hooks";

const { mutate: signInWithExternalJwt } = useSignInWithExternalJwt();

signInWithExternalJwt({
  externalJwt: token,
  externalUserId: user.id, // must match the JWT's sub claim
});`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/authentication-methods/external-jwt#usage",
  },
  {
    num: "05",
    title: "Step up for sensitive actions",
    prose:
      "For sensitive operations like exporting a key, your backend signs a short-lived assertion JWT with the same key - claims `sub`, `scope`, `jti`, `exp` - and the SDK exchanges it for an elevated access token. No re-auth or MFA prompt for the user.",
    filename: "your-app/step-up.tsx",
    lang: "typescript",
    code: `import { useRequestExternalAuthElevatedToken } from "@dynamic-labs-sdk/react-hooks";

const { mutate: requestElevatedToken } = useRequestExternalAuthElevatedToken();

// Your backend signs { sub, scope: "wallet:export", jti, exp }
requestElevatedToken({ externalJwt: jwt });`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/authentication-methods/step-up-auth/external-auth#usage",
  },
];

/**
 * Wallet-management steps - shown while the signed-in "Your Wallets"
 * dashboard screen is active. Mirrors `lib/dynamic/wallets.ts` and
 * `lib/dynamic/balance.ts`.
 */
export const WALLET_ACCOUNT_STEPS: StepSource[] = [
  {
    num: "01",
    title: "List the user's wallets",
    prose:
      "One hook returns every embedded wallet account across all registered chains - the list on the left renders straight from it, and re-renders as wallets are added.",
    filename: "components/wallets.tsx",
    lang: "typescript",
    code: `import { useGetWalletAccounts } from "@dynamic-labs-sdk/react-hooks";

const { data: walletAccounts } = useGetWalletAccounts();`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/wallets/get-wallet-accounts",
  },
  {
    num: "02",
    title: "Create a wallet on any chain",
    prose:
      "“Add Wallet” runs this: mint embedded (WaaS) accounts on any chain your extensions register. No seed phrase - keys never leave Dynamic's MPC.",
    filename: "lib/dynamic/wallets.ts",
    lang: "typescript",
    code: `import { createWaasWalletAccounts } from "@dynamic-labs-sdk/client/waas";

await createWaasWalletAccounts({ chains: ["SOL"] });`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/waas/creating-waas-wallet-accounts",
  },
  {
    num: "03",
    title: "Branch per chain with type guards",
    prose:
      "Accounts are chain-typed. Narrow with each extension's type guard before making chain-specific calls.",
    filename: "lib/dynamic/wallets.ts",
    lang: "typescript",
    code: `import { isEvmWalletAccount } from "@dynamic-labs-sdk/evm";
import { isSolanaWalletAccount } from "@dynamic-labs-sdk/solana";

if (isEvmWalletAccount(walletAccount)) {
  // viem-compatible flows: sendTransaction, sign, ...
}`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/evm/checking-evm-wallet-account-type",
  },
];

/** Shared: network dropdown (tx-history + every send section). */
const SWITCH_NETWORKS_STEP: Omit<StepSource, "num"> = {
  title: "Switch networks",
  prose:
    "The network dropdown lists every network your chain extensions register - no hardcoded chain list in the app.",
  filename: "lib/dynamic/networks.ts",
  lang: "typescript",
  code: `import { getNetworksData } from "@dynamic-labs-sdk/client";

const networks = getNetworksData();`,
  docsUrl:
    "https://www.dynamic.xyz/docs/javascript/reference/wallets/get-networks-data",
};

/** Shared: balances behind the amount field's asset picker (send sections). */
const GET_BALANCES_STEP: Omit<StepSource, "num"> = {
  title: "Read balances",
  prose:
    "The asset picker and balance line come from one hook - native + token balances for the wallet's active network, refetched when the wallet changes.",
  filename: "components/send-form.tsx",
  lang: "typescript",
  code: `import { useGetTokenBalances } from "@dynamic-labs-sdk/react-hooks";

const { data: balances } = useGetTokenBalances({
  walletAccount,
  includeNative: true,
});`,
  docsUrl:
    "https://www.dynamic.xyz/docs/javascript/reference/wallets/get-token-balances",
};

/**
 * Transaction-history steps - shown on the `tx-history` screen. Mirrors
 * `lib/dynamic/transaction-history.ts` and `lib/dynamic/networks.ts`.
 */
export const WALLET_TX_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Fetch transaction history",
    prose:
      "Paginated history for any address and network - the list on the left renders straight from this call. Pass `nextOffset` back in to page.",
    filename: "components/transactions.tsx",
    lang: "typescript",
    code: `import { useGetTransactionHistory } from "@dynamic-labs-sdk/react-hooks";

const { data } = useGetTransactionHistory({
  address,
  chain, // "EVM", "SOL", "SUI", "BTC", "TON" - same call for every chain
  networkId,
  limit: 10,
});
// data.transactions renders the list; pass data.nextOffset back to page.`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/wallets/get-transaction-history",
  },
  { num: "02", ...SWITCH_NETWORKS_STEP },
];

/**
 * Settings-screen steps - key-share backup to Google Drive. Shown while
 * the settings screen is up. Prerequisites live in prose (dashboard
 * toggle + Google Drive API in the Google Cloud project); snippets show
 * the current docs flow (pre-flight readiness + backup + scope-error
 * recovery), which is ahead of the pinned SDK by design.
 */
export const WALLET_SETTINGS_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Check Drive readiness",
    prose:
      "Prerequisite: enable Google Drive backup in the Dynamic dashboard's embedded wallet settings, and enable the Google Drive API in your Google Cloud project. Then pre-flight before backing up - if the linked Google account is missing Drive scopes, re-prompt consent instead of starting an MPC reshare that can't finish.",
    filename: "components/settings.tsx",
    lang: "typescript",
    code: `import {
  getGoogleDriveBackupReadiness,
  signInWithSocialRedirect,
} from "@dynamic-labs-sdk/client";

const readiness = await getGoogleDriveBackupReadiness();

if (readiness.status === "needs-access") {
  // Re-prompt the Google consent screen for the Drive scopes.
  await signInWithSocialRedirect({
    provider: "google",
    redirectUrl: window.location.href,
  });
}`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/waas/get-google-drive-backup-readiness",
  },
  {
    num: "02",
    title: "Back up key shares to Google Drive",
    prose:
      "One call runs the MPC reshare and uploads the user share to the user's Drive (app-data folder + personal Drive). Pass a password to encrypt the share - that's the boundary that keeps the backup unreadable to everyone but the user, including you.",
    filename: "components/settings.tsx",
    lang: "typescript",
    code: `import { backupWaasKeySharesToGoogleDrive } from "@dynamic-labs-sdk/client/waas";

await backupWaasKeySharesToGoogleDrive({
  walletAccount,
  password, // optional - encrypts the key share
});`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/wallets/embedded-wallets/mpc/google-drive-backup",
  },
  {
    num: "03",
    title: "Recover from missing scopes",
    prose:
      "Google shows the two Drive permissions as UNCHECKED opt-in boxes on the consent screen, so uploads can fail even after pre-flight (legacy links don't record scopes). Detect that case and send the user back through Google consent, then retry.",
    filename: "components/settings.tsx",
    lang: "typescript",
    code: `import {
  isInsufficientGoogleDriveScopesError,
  signInWithSocialRedirect,
} from "@dynamic-labs-sdk/client";

try {
  await backupWaasKeySharesToGoogleDrive({ walletAccount });
} catch (error) {
  if (isInsufficientGoogleDriveScopesError(error)) {
    await signInWithSocialRedirect({
      provider: "google",
      redirectUrl: window.location.href,
    });
    return;
  }
  throw error;
}`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/wallets/embedded-wallets/mpc/google-drive-backup#pre-flight-readiness-check",
  },
  {
    num: "04",
    title: "Reveal the private key",
    prose:
      "Self-custody means the user can always take their key with them. Hand the SDK a container element and it injects a secure iframe that displays the key inside it - the key never passes through your application code. Pass a password when the key share was password-encrypted.",
    filename: "components/settings.tsx",
    lang: "typescript",
    code: `import { exportWaasPrivateKey } from "@dynamic-labs-sdk/client/waas";

// <div id="reveal" /> - the SDK renders the key inside a secure
// iframe injected here; it never touches your app's code.
await exportWaasPrivateKey({
  walletAccount,
  displayContainer: document.getElementById("reveal")!,
});`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/waas/exporting-waas-private-key",
  },
];

/**
 * Send-flow steps, per chain - the `send-tx` and `scan-qr` screens show
 * the section for the chain being sent from (docs are chain-specific,
 * so the panel must be too). Send snippets mirror
 * `lib/transactions/send-<chain>-transaction.ts`; sponsorship steps
 * exist only where Dynamic supports it (EVM, SVM) and link the chain's
 * gas-sponsorship docs page - never ZeroDev docs.
 */
export const WALLET_SEND_STEPS_BY_CHAIN: Record<SendChain, StepSource[]> = {
  EVM: [
    {
      num: "01",
      title: "Send a transaction",
      prose:
        "Wrap the wallet account in a viem-compatible client and send - the user approves in place; keys never leave Dynamic's MPC.",
      filename: "lib/transactions/send-evm-transaction.ts",
      lang: "typescript",
      code: `import { createWalletClientForWalletAccount } from "@dynamic-labs-sdk/evm/viem";
import { parseEther } from "viem";

const walletClient = await createWalletClientForWalletAccount({ walletAccount });

const hash = await walletClient.sendTransaction({
  to: recipient,
  value: parseEther(amount),
});`,
      docsUrl:
        "https://www.dynamic.xyz/docs/javascript/reference/evm/getting-viem-wallet-client",
    },
    {
      num: "02",
      title: "Sponsor Network Fees",
      prose:
        "The “Gas Sponsored” badge comes from this: flip the dashboard toggle and call one function - your app pays the fee, and the SDK handles the one-time EIP-7702 delegation automatically.",
      filename: "lib/transactions/send-evm-transaction.ts",
      lang: "typescript",
      code: `import { sendSponsoredTransaction } from "@dynamic-labs-sdk/evm";

const { transactionHash } = await sendSponsoredTransaction({
  walletAccount,
  calls: [
    {
      target: recipient,
      data: "0x",
      value: parseEther(amount),
    },
  ],
});`,
      docsUrl:
        "https://www.dynamic.xyz/docs/javascript/reference/evm/evm-gas-sponsorship",
    },
    { num: "03", ...GET_BALANCES_STEP },
    { num: "04", ...SWITCH_NETWORKS_STEP },
  ],
  SOL: [
    {
      num: "01",
      title: "Send a transaction",
      prose:
        "Build any `@solana/web3.js` transaction - here a `SystemProgram.transfer` - and the SDK signs and broadcasts it with the embedded wallet.",
      filename: "lib/transactions/send-solana-transaction.ts",
      lang: "typescript",
      code: `import { signAndSendTransaction } from "@dynamic-labs-sdk/solana";

const { signature } = await signAndSendTransaction({
  transaction,
  walletAccount,
});`,
      docsUrl:
        "https://www.dynamic.xyz/docs/javascript/reference/solana/signing-sending-transactions",
    },
    {
      num: "02",
      title: "Sponsor Network Fees",
      prose:
        "The “Gas Sponsored” badge on Solana: flip the dashboard toggle and require sponsorship - Dynamic replaces the fee payer, so users can transact with zero SOL.",
      filename: "lib/transactions/send-solana-transaction.ts",
      lang: "typescript",
      code: `import { signAndSendSponsoredTransaction } from "@dynamic-labs-sdk/solana";

const { signature } = await signAndSendSponsoredTransaction({
  transaction,
  walletAccount,
});`,
      docsUrl:
        "https://www.dynamic.xyz/docs/javascript/reference/solana/svm-gas-sponsorship",
    },
    { num: "03", ...GET_BALANCES_STEP },
    { num: "04", ...SWITCH_NETWORKS_STEP },
  ],
  SUI: [
    {
      num: "01",
      title: "Send a transaction",
      prose:
        "Compose a Sui programmable transaction; the SDK signs and executes it with the embedded wallet.",
      filename: "lib/transactions/send-sui-transaction.ts",
      lang: "typescript",
      code: `import { signAndExecuteTransaction } from "@dynamic-labs-sdk/sui";
import { Transaction } from "@mysten/sui/transactions";

const tx = new Transaction();
const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
tx.transferObjects([coin], recipient);

const { digest } = await signAndExecuteTransaction({
  transaction: tx,
  walletAccount,
});`,
      docsUrl:
        "https://www.dynamic.xyz/docs/javascript/reference/sui/sign-and-execute-transaction",
    },
    { num: "02", ...GET_BALANCES_STEP },
    { num: "03", ...SWITCH_NETWORKS_STEP },
  ],
  BTC: [
    {
      num: "01",
      title: "Send a transaction",
      prose:
        "One call - the SDK builds, signs, and broadcasts the Bitcoin transaction from the embedded wallet.",
      filename: "lib/transactions/send-bitcoin-transaction.ts",
      lang: "typescript",
      code: `import { sendBitcoin } from "@dynamic-labs-sdk/bitcoin";

const { transactionId } = await sendBitcoin({
  transaction: {
    amount: amountInSats,
    recipientAddress: recipient,
  },
  walletAccount,
});`,
      docsUrl:
        "https://www.dynamic.xyz/docs/javascript/reference/bitcoin/send-bitcoin",
    },
    { num: "02", ...GET_BALANCES_STEP },
    { num: "03", ...SWITCH_NETWORKS_STEP },
  ],
  TON: [
    {
      num: "01",
      title: "Send a transaction",
      prose:
        "Same shape on TON - the SDK signs and broadcasts from the embedded wallet.",
      filename: "lib/transactions/send-ton-transaction.ts",
      lang: "typescript",
      code: `import { sendTon } from "@dynamic-labs-sdk/ton";

const { transactionHash } = await sendTon({
  transaction: {
    recipientAddress: recipient,
    amount: amountInNanotons,
  },
  walletAccount,
});`,
      docsUrl:
        "https://www.dynamic.xyz/docs/javascript/reference/ton/send-ton",
    },
    { num: "02", ...GET_BALANCES_STEP },
    { num: "03", ...SWITCH_NETWORKS_STEP },
  ],
};

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
