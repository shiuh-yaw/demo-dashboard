"use client";

/**
 * Every business-account read and write, as TanStack Query hooks.
 *
 * Two rules hold across the file:
 *   1. Mutations that the API gates on an elevated access token go through
 *      `withStepUp(scope, …)`, so the prompt happens before the call rather
 *      than surfacing as a 403.
 *   2. Every mutation invalidates the detail AND the list, plus the SDK's own
 *      wallet-accounts cache when it moved wallet ownership - the react-hooks
 *      key is namespaced, so it is matched by segment.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { useMilestone } from "@/hooks/use-milestone";
import {
  addBusinessAccountMember,
  addBusinessAccountSigner,
  createBusinessAccount,
  createWalletForBusinessAccount,
  getBusinessAccount,
  listBusinessAccounts,
  removeBusinessAccountMember,
  removeBusinessAccountSigner,
  removeBusinessAccountWallet,
  TokenScope,
  transferBusinessAccountOwnership,
  updateBusinessAccount,
  updateBusinessAccountMemberRole,
  type AssignableRole,
  type BusinessAccount,
  type BusinessAccountDetail,
  type BusinessAccountWalletSummary,
  type Chain,
  type TargetIdentity,
} from "@/lib/dynamic";
import { rememberMemberEmail } from "@/lib/business-accounts/member-emails";
import { signersOf } from "@/lib/business-accounts/view";
import type { WalletChain } from "@/lib/chains";
import { useStepUp } from "@/components/step-up/step-up-provider";

const LIST_KEY: QueryKey = ["business-accounts"];
const detailKey = (id: string | undefined): QueryKey => [
  "business-account",
  id ?? "none",
];

/** The wallet's signer user ids, in roster order, nulls dropped. */
function signerUserIds(
  detail: BusinessAccountDetail | undefined,
  walletId: string,
): string[] {
  return signersOf(detail, walletId)
    .map((signer) => signer.userId)
    .filter((userId): userId is string => Boolean(userId));
}

// =============================================================================
// READS
// =============================================================================

/** Accounts the signed-in user is a member of. */
export function useBusinessAccounts(enabled: boolean) {
  const query = useQuery({
    queryKey: LIST_KEY,
    queryFn: async () => (await listBusinessAccounts()).items ?? [],
    enabled,
  });
  return {
    accounts: (query.data ?? []) as BusinessAccount[],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * One account expanded with members, signers, and wallets.
 *
 * Seeded from the list cache so opening an account paints its name and id on
 * the first frame instead of a spinner that resolves into a taller card. The
 * list already carries everything on `BusinessAccount`; only `members`,
 * `signers`, and `wallets` have to be fetched, so callers distinguish "no data
 * at all" (`isLoading`) from "header known, counts still arriving"
 * (`isPlaceholder`) and keep the card's height stable across the swap.
 */
export function useBusinessAccount(businessAccountId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: detailKey(businessAccountId),
    queryFn: () =>
      getBusinessAccount({ businessAccountId: businessAccountId! }),
    enabled: Boolean(businessAccountId),
    placeholderData: () => {
      if (!businessAccountId) return undefined;
      const listed = queryClient
        .getQueryData<BusinessAccount[]>(LIST_KEY)
        ?.find((account) => account.id === businessAccountId);
      if (!listed) return undefined;
      // Empty collections, not fabricated ones: every consumer reads them
      // through `walletsOf` / `signersOf` / `memberFor`, which treat empty as
      // "nothing to show" - and `isPlaceholder` tells the screen not to render
      // those as facts yet.
      return { ...listed, members: [], signers: [], wallets: undefined };
    },
  });

  return {
    detail: query.data as BusinessAccountDetail | undefined,
    /** No data at all - not even the list's summary. */
    isLoading: query.isLoading,
    /** Header is real, the embedded collections are not yet. */
    isPlaceholder: query.isPlaceholderData,
    error: query.error,
    refetch: query.refetch,
  };
}

// =============================================================================
// INVALIDATION
// =============================================================================

function useInvalidate() {
  const queryClient = useQueryClient();

  return useCallback(
    (businessAccountId?: string, options?: { walletOwnership?: boolean }) => {
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
      if (businessAccountId) {
        void queryClient.invalidateQueries({
          queryKey: detailKey(businessAccountId),
        });
      }
      if (options?.walletOwnership) {
        // react-hooks caches under a namespaced key
        // (["@dynamic-labs-sdk/react-hooks", "state", "useGetWalletAccounts"]),
        // so match by segment rather than by exact key.
        void queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes("useGetWalletAccounts"),
        });
      }
    },
    [queryClient],
  );
}

// =============================================================================
// ACCOUNT WRITES (no step-up - the caller is acting on their own behalf)
// =============================================================================

export function useCreateAccount() {
  const invalidate = useInvalidate();
  const milestone = useMilestone();

  return useMutation({
    mutationFn: (input: {
      name?: string;
      externalRef?: string;
      metadata?: Record<string, unknown>;
    }) => createBusinessAccount(input),
    onSuccess: (account, input) => {
      // Shape only - never the account id, name, or external ref itself.
      milestone("account_created", {
        named: Boolean(account.name),
        hasExternalRef: Boolean(account.externalRef),
        hasLogo: Boolean(input.metadata),
      });
      invalidate(account.id);
    },
  });
}

export function useRenameAccount() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (input: { businessAccountId: string; name: string }) =>
      updateBusinessAccount(input),
    onSuccess: (_result, input) => invalidate(input.businessAccountId),
  });
}

// =============================================================================
// WALLET WRITES
// =============================================================================

/**
 * How long to wait on the wallet-creation ceremony before giving up on the
 * promise. Unlike the server-state mutations, this one runs an MPC ceremony
 * through the WaaS iframe, which can stall instead of rejecting - leaving a
 * spinner up forever with the wallet possibly already minted.
 */
const WALLET_CEREMONY_TIMEOUT_MS = 90_000;

class WalletCeremonyTimeout extends Error {
  constructor() {
    super(
      "Wallet creation did not finish in time. It may still have been created - refreshing the account to check.",
    );
    this.name = "WalletCeremonyTimeout";
  }
}

/** Mints a wallet the account owns outright. No step-up gate. */
export function useCreateAccountWallet() {
  const invalidate = useInvalidate();
  const milestone = useMilestone();

  return useMutation({
    mutationFn: async (input: {
      businessAccountId: string;
      chain: WalletChain;
    }) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          createWalletForBusinessAccount({
            businessAccountId: input.businessAccountId,
            chain: input.chain as Chain,
          }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new WalletCeremonyTimeout()),
              WALLET_CEREMONY_TIMEOUT_MS,
            );
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
    // Re-read either way: on timeout the wallet may exist despite the stall, so
    // the list is the source of truth rather than the promise.
    onSettled: (_data, _error, input) =>
      invalidate(input.businessAccountId, { walletOwnership: true }),
    onSuccess: (_result, input) => {
      milestone("account_wallet_created", { chain: input.chain });
      invalidate(input.businessAccountId, { walletOwnership: true });
    },
  });
}

export function useRemoveWallet() {
  const invalidate = useInvalidate();
  const { withStepUp } = useStepUp();

  return useMutation({
    mutationFn: (input: { businessAccountId: string; walletId: string }) =>
      withStepUp(TokenScope.BusinessAccountwalletremove, () =>
        removeBusinessAccountWallet(input),
      ),
    onSuccess: (_result, input) =>
      invalidate(input.businessAccountId, { walletOwnership: true }),
  });
}

// =============================================================================
// SIGNER WRITES
// =============================================================================

/**
 * Adds a signer, then reads the roster back to find out who it landed as.
 *
 * `addBusinessAccountSigner` resolves to `{ shareSetId }` alone: it reports
 * neither the user it resolved the identity to nor whether the row survived.
 * So this re-reads the account and diffs the wallet's signer ids against the
 * ones held before the call. That single read answers both open questions -
 * which `userId` to pair the typed address with, and whether a row appeared at
 * all. `addedUserId` is null when the reshare reported success and left nothing
 * behind, which the screen surfaces rather than navigating away from.
 */
export function useAddSigner() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  const { withStepUp } = useStepUp();
  const milestone = useMilestone();

  return useMutation({
    mutationFn: async (input: {
      businessAccountId: string;
      wallet: BusinessAccountWalletSummary;
      targetIdentity: TargetIdentity;
      /** Reported to analytics as shape; the identifier itself never is. */
      identifiedBy: string;
    }) => {
      const before = new Set(
        signerUserIds(
          queryClient.getQueryData<BusinessAccountDetail>(
            detailKey(input.businessAccountId),
          ),
          input.wallet.id,
        ),
      );

      const { shareSetId } = await withStepUp(
        TokenScope.BusinessAccountsigneradd,
        () =>
          addBusinessAccountSigner({
            businessAccountId: input.businessAccountId,
            targetIdentity: input.targetIdentity,
            wallet: {
              address: input.wallet.publicKey,
              chain: input.wallet.chain,
            },
          }),
      );

      const detail = await queryClient.fetchQuery({
        queryKey: detailKey(input.businessAccountId),
        queryFn: () =>
          getBusinessAccount({ businessAccountId: input.businessAccountId }),
        staleTime: 0,
      });

      const addedUserId =
        signerUserIds(detail as BusinessAccountDetail, input.wallet.id).find(
          (userId) => !before.has(userId),
        ) ?? null;

      return { shareSetId, addedUserId };
    },
    onSuccess: ({ addedUserId }, input) => {
      // The one moment this app can pair a userId with an address - the roster
      // itself carries no identifier.
      rememberMemberEmail(
        input.businessAccountId,
        addedUserId,
        input.targetIdentity.identifierType === "email"
          ? input.targetIdentity.identifier
          : null,
      );
      milestone("signer_added", {
        chain: input.wallet.chain,
        identifiedBy: input.identifiedBy,
        landed: addedUserId !== null,
      });
      invalidate(input.businessAccountId);
    },
  });
}

export function useRemoveSigner() {
  const invalidate = useInvalidate();
  const { withStepUp } = useStepUp();

  return useMutation({
    mutationFn: (input: {
      businessAccountId: string;
      walletId: string;
      signerId: string;
    }) =>
      withStepUp(TokenScope.BusinessAccountsignerremove, () =>
        removeBusinessAccountSigner(input),
      ),
    onSuccess: (_result, input) => invalidate(input.businessAccountId),
  });
}

// =============================================================================
// MEMBER WRITES
// =============================================================================

export function useAddMember() {
  const invalidate = useInvalidate();
  const { withStepUp } = useStepUp();
  const milestone = useMilestone();

  return useMutation({
    mutationFn: (input: {
      businessAccountId: string;
      targetIdentity: TargetIdentity;
      role: AssignableRole;
      identifiedBy: string;
    }) =>
      withStepUp(TokenScope.BusinessAccountmemberadd, () =>
        addBusinessAccountMember({
          businessAccountId: input.businessAccountId,
          targetIdentity: input.targetIdentity,
          role: input.role,
        }),
      ),
    onSuccess: (member, input) => {
      // The only moment this app can pair a userId with an address: the
      // roster read back from the server carries no identifier at all.
      rememberMemberEmail(
        input.businessAccountId,
        member.userId,
        input.targetIdentity.identifierType === "email"
          ? input.targetIdentity.identifier
          : null,
      );
      milestone("member_added", {
        role: input.role,
        identifiedBy: input.identifiedBy,
      });
      invalidate(input.businessAccountId);
    },
  });
}

export function useUpdateMemberRole() {
  const invalidate = useInvalidate();
  const { withStepUp } = useStepUp();

  return useMutation({
    mutationFn: (input: {
      businessAccountId: string;
      userId: string;
      role: AssignableRole;
    }) =>
      withStepUp(TokenScope.BusinessAccountmemberroleupdate, () =>
        updateBusinessAccountMemberRole(input),
      ),
    onSuccess: (_result, input) => invalidate(input.businessAccountId),
  });
}

export function useTransferOwnership() {
  const invalidate = useInvalidate();
  const { withStepUp } = useStepUp();

  return useMutation({
    // Transfer takes a single-use token, so this scope is never bundled with
    // the others - it always prompts for its own verification.
    mutationFn: (input: {
      businessAccountId: string;
      newOwnerUserId: string;
    }) =>
      withStepUp(TokenScope.BusinessAccounttransferOwnership, () =>
        transferBusinessAccountOwnership(input),
      ),
    onSuccess: (_result, input) => invalidate(input.businessAccountId),
  });
}

export function useRemoveMember() {
  const invalidate = useInvalidate();
  const { withStepUp } = useStepUp();

  return useMutation({
    mutationFn: (input: { businessAccountId: string; userId: string }) =>
      withStepUp(TokenScope.BusinessAccountmemberremove, () =>
        removeBusinessAccountMember(input),
      ),
    onSuccess: (_result, input) => invalidate(input.businessAccountId),
  });
}
