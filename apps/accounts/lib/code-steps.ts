import type { CodeStep } from "@dynamic-demos/ui";
import { highlight, type HighlightLang } from "@dynamic-demos/code-highlight";

/**
 * Integration-panel content for the accounts scenario page. Each snippet
 * mirrors the live implementation (file named in `filename`); if the app code
 * changes, update the matching snippet in the same PR.
 *
 * Snippets teach the documented `@dynamic-labs-sdk/client/waas` surface, not
 * this app's plumbing - a reader should be able to paste one into their own
 * project. Every TypeScript snippet therefore opens with its import line
 * (test-enforced).
 */

export interface StepSource {
  num: string;
  title: string;
  prose: string;
  filename: string;
  lang: HighlightLang;
  code: string;
  /** Omitted while the Business Accounts docs are unpublished. */
  docsUrl?: string;
}

/** Pre-auth: what it takes to get from an empty page to an account list. */
export const ACCOUNTS_SDK_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Create the client",
    prose:
      "One Dynamic client per app, created at module scope. Chain extensions register which networks a business account can mint wallets on.",
    filename: "lib/dynamic/client.ts",
    lang: "typescript",
    code: `import { createDynamicClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { addSolanaExtension } from "@dynamic-labs-sdk/solana";

export const client = createDynamicClient({
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,
});
addEvmExtension(client);
addSolanaExtension(client);`,
    docsUrl: "https://www.dynamic.xyz/docs/overview/wallets/overview",
  },
  {
    num: "02",
    title: "Wrap your app for hooks",
    prose:
      "The react-hooks package reads the client from context and uses TanStack Query underneath, so mount `QueryClientProvider` outside `DynamicProvider` once - every hook below works anywhere inside.",
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
      "Send a one-time passcode and verify it. The signed-in user is who every call below is authorized as - their membership decides what they can see and do.",
    filename: "components/screens/auth-screen.tsx",
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
    title: "List the accounts they belong to",
    prose:
      "Scoped to the signed-in user and the active environment - a user only ever sees accounts they are a member of. This is the first call after sign-in.",
    filename: "hooks/use-business-accounts.ts",
    lang: "typescript",
    code: `import { listBusinessAccounts } from "@dynamic-labs-sdk/client/waas";

const { items = [], nextCursor } = await listBusinessAccounts();
for (const account of items) {
  console.log(account.id, account.name, account.externalRef);
}`,
  },
];

/** Creating and reading an account. */
export const ACCOUNTS_ACCOUNT_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Create a business account",
    prose:
      "The caller becomes the account's first `owner`. `externalRef` is your own ID for the org - not unique, so treat it as a label rather than a key - and `metadata` is free-form JSON.",
    filename: "lib/dynamic/business-accounts.ts",
    lang: "typescript",
    code: `import { createBusinessAccount } from "@dynamic-labs-sdk/client/waas";

const account = await createBusinessAccount({
  name: "Acme Treasury",
  externalRef: "acme-org-42",
  metadata: { websiteUrl: "acme.com" },
});`,
  },
  {
    num: "02",
    title: "Read one account in full",
    prose:
      "Returns the account expanded with its `members`, `signers`, and `wallets` - one call backs the whole screen. A non-member gets a 404, not a 403, so account existence never leaks.",
    filename: "hooks/use-business-accounts.ts",
    lang: "typescript",
    code: `import { getBusinessAccount } from "@dynamic-labs-sdk/client/waas";

const detail = await getBusinessAccount({ businessAccountId });
// detail.members[].role  -> "owner" | "admin" | "viewer"
// detail.signers[]       -> one row per (signer, wallet) pair
// detail.wallets[]       -> superset of the wallets signers reference`,
  },
];

/** Renaming - the rename screen only. */
export const ACCOUNTS_RENAME_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Rename an account",
    prose:
      "Owner and admin only. `name` is the only mutable field, and a rejection surfaces as a thrown error rather than stalling.",
    filename: "hooks/use-business-accounts.ts",
    lang: "typescript",
    code: `import { updateBusinessAccount } from "@dynamic-labs-sdk/client/waas";

await updateBusinessAccount({ businessAccountId, name: "Acme Ops" });`,
  },
];

/** The account's wallet list - the wallets screen only. */
export const ACCOUNTS_WALLET_STEPS: StepSource[] = [
  {
    num: "01",
    title: "List the wallets an account owns",
    prose:
      "The account's roster comes back on the account itself. Cross it with `getWalletAccounts` - what this session can actually sign with - and the difference is the admin/signer split: a wallet on the roster with no match is one the user administers but holds no share for.",
    filename: "components/screens/wallets-screen.tsx",
    lang: "typescript",
    code: `import { getWalletAccounts } from "@dynamic-labs-sdk/client";
import { getBusinessAccount } from "@dynamic-labs-sdk/client/waas";

const { wallets } = await getBusinessAccount({ businessAccountId });

// Which of them this user holds a share for.
const walletAccounts = await getWalletAccounts();
const signable = walletAccounts.filter(
  (account) => account.businessAccountId === businessAccountId,
);`,
  },
];

/** Minting a wallet - the add-wallet screen only. */
export const ACCOUNTS_ADD_WALLET_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Mint a wallet the account owns",
    prose:
      "The server seats the wallet's signer row against the account as it is minted, so the wallet belongs to the account outright. The SDK refreshes local auth for you, so the new wallet appears in this session immediately.",
    filename: "components/screens/add-wallet-screen.tsx",
    lang: "typescript",
    code: `import { createWalletForBusinessAccount } from "@dynamic-labs-sdk/client/waas";

const wallet = await createWalletForBusinessAccount({
  businessAccountId,
  chain: "EVM",
});`,
  },
];

/** Adding and revoking the people who can sign. */
export const ACCOUNTS_SIGNER_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Elevate the session first",
    prose:
      "Signer and member mutations are gated on a scoped elevated access token. Check, re-verify the user with a credential they already have, and pass the scope as `requestedScopes` - the SDK attaches the resulting token to the next call automatically. Bundle the other scopes in the same verification so one prompt covers the session.",
    filename: "components/step-up/step-up-provider.tsx",
    lang: "typescript",
    code: `import {
  checkStepUpAuth,
  sendEmailOTP,
  verifyOTP,
  TokenScope,
} from "@dynamic-labs-sdk/client";

const { isRequired, credentials } = await checkStepUpAuth({
  scope: TokenScope.BusinessAccountsigneradd,
});
if (isRequired) {
  const otpVerification = await sendEmailOTP({ email: credentials[0].alias! });
  await verifyOTP({
    otpVerification,
    verificationToken: code,
    requestedScopes: [TokenScope.BusinessAccountsigneradd],
  });
}`,
  },
  {
    num: "02",
    title: "Add a co-signer",
    prose:
      "Runs the reshare ceremony that mints the new signer's own share set, so two people now sign for the same MPC wallet. You must already sign for the wallet - only an existing share-holder can reshare. Identify the target by `userId`, or by `identifier` plus `identifierType`; the user is created if they do not exist yet.",
    filename: "components/screens/add-signer-screen.tsx",
    lang: "typescript",
    code: `import { addBusinessAccountSigner } from "@dynamic-labs-sdk/client/waas";

const { shareSetId } = await addBusinessAccountSigner({
  businessAccountId,
  targetIdentity: { identifier: "cfo@acme.example", identifierType: "email" },
  walletAccount: { address: wallet.publicKey, chain: wallet.chain },
});`,
  },
  {
    num: "03",
    title: "Revoke a signer",
    prose:
      "Severs only that signer's MPC pair. No ceremony runs and every other signer's share set is an independent pair, so the wallet and the remaining signers are untouched. The backend refuses to leave a wallet with zero signers.",
    filename: "components/screens/wallet-signers-screen.tsx",
    lang: "typescript",
    code: `import { removeBusinessAccountSigner } from "@dynamic-labs-sdk/client/waas";

await removeBusinessAccountSigner({
  businessAccountId,
  walletId: signer.walletId,
  signerId: signer.id,
});`,
  },
];

/** Who administers the account, as distinct from who signs. */
export const ACCOUNTS_MEMBER_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Add a member with a role",
    prose:
      "Members administer, signers sign - an `admin` cannot sign, and a signer gets no admin rights. `admin` can manage members, signers, and wallet links; `viewer` is read-only. Defaults to `viewer`.",
    filename: "components/screens/members-screen.tsx",
    lang: "typescript",
    code: `import { addBusinessAccountMember } from "@dynamic-labs-sdk/client/waas";

const member = await addBusinessAccountMember({
  businessAccountId,
  role: "admin",
  targetIdentity: { identifier: "ops@acme.example", identifierType: "email" },
});`,
  },
  {
    num: "02",
    title: "Promote, demote, or hand over the account",
    prose:
      "Role updates move a member between `admin` and `viewer`. `owner` is reached only by transfer, which is owner-only, requires the target to already be a member, and atomically demotes the outgoing owner to `admin`. Transfer takes a single-use token, so it always prompts for its own verification.",
    filename: "components/screens/members-screen.tsx",
    lang: "typescript",
    code: `import {
  transferBusinessAccountOwnership,
  updateBusinessAccountMemberRole,
} from "@dynamic-labs-sdk/client/waas";

await updateBusinessAccountMemberRole({
  businessAccountId,
  userId: member.userId,
  role: "admin",
});

await transferBusinessAccountOwnership({
  businessAccountId,
  newOwnerUserId: member.userId,
});`,
  },
  {
    num: "03",
    title: "Remove a member",
    prose:
      "Every signer row that user held across the account's wallets is torn down with them in one transaction - so the backend refuses if the removal would leave any wallet with zero signers.",
    filename: "components/screens/members-screen.tsx",
    lang: "typescript",
    code: `import { removeBusinessAccountMember } from "@dynamic-labs-sdk/client/waas";

await removeBusinessAccountMember({ businessAccountId, userId: member.userId });`,
  },
];

/**
 * Acting WITH a wallet, rather than administering it.
 *
 * None of these are business-account calls: a wallet the account owns and the
 * user holds a share for is just a `WalletAccount`, so the ordinary wallet
 * surface applies unchanged. That is the point worth teaching - the co-signing
 * arrangement lives in how the key was shared, not in how value moves.
 *
 * Split one array per screen rather than one array for the whole wallet: the
 * panel is read beside a screen, and a step for a call that screen does not
 * make is noise the reader has to skip.
 */
/** Shared: the network chip on the wallet's screens. */
const SWITCH_NETWORKS_STEP: Omit<StepSource, "num"> = {
  title: "Switch networks",
  prose:
    "The network chip lists what your chain extensions register - no hardcoded chain list in the app, and the id it yields is what history and sends are read against.",
  filename: "lib/dynamic/networks.ts",
  lang: "typescript",
  code: `import { getNetworksData } from "@dynamic-labs-sdk/client";

const networks = getNetworksData();`,
  docsUrl:
    "https://www.dynamic.xyz/docs/javascript/reference/wallets/get-networks-data",
};

export const ACCOUNTS_TRANSACTION_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Show what it has done",
    prose:
      "Paged by cursor: the response carries a `nextOffset` to hand back for the following page. Chain-agnostic like the send, so one list renders every chain.",
    filename: "components/screens/wallet-transactions-screen.tsx",
    lang: "typescript",
    code: `import { getTransactionHistory } from "@dynamic-labs-sdk/client";

const { transactions, nextOffset } = await getTransactionHistory({
  address: walletAccount.address,
  chain: walletAccount.chain,
  networkId,
  limit: 10,
});`,
  },
  { num: "02", ...SWITCH_NETWORKS_STEP },
];

/** Moving value - the send screen only. */
export const ACCOUNTS_SEND_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Send from it",
    prose:
      "One call for every chain. `transferAmount` dispatches to whichever chain extension is registered, so EVM, Solana, Bitcoin, Sui and TON all go through this line - no per-chain transaction builders. Pass `token` for a fungible transfer, omit it for the native currency.",
    filename: "components/screens/send-transaction-screen.tsx",
    lang: "typescript",
    code: `import { transferAmount } from "@dynamic-labs-sdk/client";

const { transactionHash } = await transferAmount({
  walletAccount,
  amount: "1.5",
  recipient,
  // Omit for the chain's native currency.
  token: { address: usdcAddress, decimals: 6 },
});`,
  },
  {
    num: "02",
    title: "Sponsor the gas",
    prose:
      "On EVM, Dynamic's own relayer can pay. This is EIP-7702 - the wallet stays an EOA and delegates execution for the call rather than being replaced by a smart account - so a treasury holding only USDC can still move it. Check once, then send calls instead of a transfer.",
    filename: "lib/dynamic/gasless.ts",
    lang: "typescript",
    code: `import {
  isEvmGasSponsorshipEnabled,
  sendSponsoredTransaction,
} from "@dynamic-labs-sdk/evm";

if (isEvmGasSponsorshipEnabled()) {
  const { transactionHash } = await sendSponsoredTransaction({
    walletAccount,
    calls: [{ target: recipient, data: "0x", value: parseEther("0.01") }],
  });
}`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/evm/evm-gas-sponsorship",
  },
  {
    num: "03",
    title: "Read balances",
    prose:
      "The asset picker and the balance line above the amount field come from one call. `includeNative` folds the gas currency into the token list, so a single request feeds both.",
    filename: "lib/dynamic/balance.ts",
    lang: "typescript",
    code: `import { getTokenBalances } from "@dynamic-labs-sdk/client";

const tokens = await getTokenBalances({
  walletAccount,
  includeNative: true,
});`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/wallets/get-token-balances",
  },
  { num: "04", ...SWITCH_NETWORKS_STEP },
];

/**
 * Rules the enclave enforces - the policies screen only.
 *
 * Snippets teach the generated endpoints rather than this app's sugar: the
 * SDK's own `createPolicy` / `getPolicy` helpers are not published yet, and a
 * reader should paste something that works today.
 */
export const ACCOUNTS_POLICY_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Read a layer",
    prose:
      "One layer per scope, each holding its own rules: the account layer binds every wallet it owns, the wallet layer everyone who signs for one wallet, the signer layer one share set. Reading the layer directly returns raw rules with their ids, which is what makes them editable one at a time.",
    filename: "lib/dynamic/policies.ts",
    lang: "typescript",
    code: `import { getWalletPolicyLayer } from "@dynamic-labs-sdk/client/waas";

const layer = await getWalletPolicyLayer({ walletAccount });

for (const rule of layer.layerContent.rules ?? []) {
  // rule.ruleId, rule.ruleType, rule.addresses, rule.valueLimit
}`,
  },
  {
    num: "02",
    title: "Allow one destination, up to an amount",
    prose:
      "A rule per destination: the address it permits, and a `valueLimit` in the asset's smallest unit - omit `asset` to cap the chain's native coin. Allowing an address denies every address no rule names. Pass a `ruleId` to edit that rule in place; omit it and the enclave mints one.",
    filename: "lib/dynamic/policies.ts",
    lang: "typescript",
    code: `import {
  buildAllowPolicyRule,
  upsertWalletPolicyRule,
} from "@dynamic-labs-sdk/client/waas";

await upsertWalletPolicyRule({
  walletAccount,
  rule: buildAllowPolicyRule({
    name: "Allow treasury",
    chain: "EVM",
    chainIds: [84532],
    addresses: ["0x036CbD53842c5426634e7929541eC2318f3dCF7e"],
    // 100 USDC - six decimals, not eighteen.
    valueLimit: { maxPerCall: "100000000", asset: usdcAddress },
  }),
});`,
  },
  {
    num: "03",
    title: "Block an address outright",
    prose:
      "A deny rule needs no amount: nothing may reach the address, whatever the transaction is worth. A deny with a `valueLimit` and no addresses is the other useful shape - the cap that applies wherever no destination rule does.",
    filename: "components/screens/policy-destination-screen.tsx",
    lang: "typescript",
    code: `import {
  buildDenyPolicyRule,
  upsertWalletPolicyRule,
} from "@dynamic-labs-sdk/client/waas";

await upsertWalletPolicyRule({
  walletAccount,
  rule: buildDenyPolicyRule({
    name: "Deny 0x1f9a...",
    chain: "EVM",
    chainIds: [84532],
    addresses: ["0x1f9a..."],
  }),
});`,
  },
  {
    num: "04",
    title: "Tighten one signer",
    prose:
      "The same builders, written to a signer's own layer with `shareSetId`. Layers only ever tighten - a signer's rules can be stricter than the wallet's, never looser - so this gives one member a shorter leash without touching anyone else. Removing a rule takes its id.",
    filename: "components/screens/wallet-policies-screen.tsx",
    lang: "typescript",
    code: `import {
  buildAllowPolicyRule,
  removeSignerPolicyRule,
  upsertSignerPolicyRule,
} from "@dynamic-labs-sdk/client/waas";

await upsertSignerPolicyRule({
  walletAccount,
  shareSetId: signer.shareSetId,
  rule: buildAllowPolicyRule({
    name: "Allow payroll",
    chain: "EVM",
    chainIds: [84532],
    addresses: ["0x..."],
    valueLimit: { maxPerCall: "5000000", asset: usdcAddress },
  }),
});

await removeSignerPolicyRule({
  walletAccount,
  shareSetId: signer.shareSetId,
  ruleId,
});`,
  },
];

/** Signing a message - the sign screen only. */
export const ACCOUNTS_SIGNING_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Sign a message",
    prose:
      "The cheapest proof that a co-signed wallet really signs: no network, no gas, nothing to fund. The user's share and the server's produce the signature together, and the call is the same one any embedded wallet uses.",
    filename: "components/screens/sign-message-screen.tsx",
    lang: "typescript",
    code: `import { signMessage } from "@dynamic-labs-sdk/client";

const { signature } = await signMessage({
  walletAccount,
  message: "Approved by the treasury",
});`,
    docsUrl:
      "https://www.dynamic.xyz/docs/javascript/reference/wallets/sign-message",
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
