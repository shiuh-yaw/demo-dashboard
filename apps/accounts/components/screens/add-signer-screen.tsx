"use client";

/**
 * Add a co-signer to one wallet.
 *
 * This is the reshare ceremony - it mints the new signer's own share set from
 * the caller's, so two people end up signing for the same MPC wallet. It needs
 * an elevated access token, which `useAddSigner` obtains via the step-up prompt
 * before the call.
 *
 * Two ways in, because the common case is promoting someone already on the
 * account: the roster is listed first (already loaded with the account, and
 * `targetIdentity` accepts a bare `userId`, so no identifier is needed), with
 * an email field for someone who is not a member yet.
 *
 * Email only, matching "add a member". The SDK accepts five other identifier
 * types and `lib/business-accounts/identity.ts` still maps them all, but an
 * address is the one identifier this app can read back afterwards, so it is the
 * one the UI offers.
 */

import { useState } from "react";
import { UserRound, X } from "lucide-react";
import { Button, IconButton, Input, Spinner, WidgetCard } from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import { EmptyState, Mono, SectionLabel } from "@/components/ui/atoms";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import {
  useAddSigner,
  useBusinessAccount,
} from "@/hooks/use-business-accounts";
import { useMemberEmails } from "@/hooks/use-member-emails";
import {
  buildTargetIdentity,
  identityInputError,
} from "@/lib/business-accounts/identity";
import type { BusinessAccountWalletSummary } from "@/lib/dynamic";
import {
  shorten,
  signersOf,
} from "@/lib/business-accounts/view";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function AddSignerScreen({
  businessAccountId,
  wallet,
  navigation,
}: {
  businessAccountId: string;
  wallet: BusinessAccountWalletSummary;
  navigation: NavigationReturn;
}) {
  usePanelSectionEffect("signers");

  const [email, setEmail] = useState("");
  /** The call succeeded but the roster came back without a new signer. */
  const [notLanded, setNotLanded] = useState(false);
  const addSigner = useAddSigner();
  const { detail, isLoading } = useBusinessAccount(businessAccountId);
  const emailFor = useMemberEmails(businessAccountId);

  // Members who cannot already sign for THIS wallet. Signer rows are per
  // wallet, so someone who signs for another of the account's wallets is still
  // a candidate here.
  const existingSignerIds = new Set(
    signersOf(detail, wallet.id)
      .map((signer) => signer.userId)
      .filter((id): id is string => Boolean(id)),
  );
  const candidates = (detail?.members ?? []).filter(
    (member) => !existingSignerIds.has(member.userId),
  );

  // Set only while a row from the list above is being added - an email
  // submission leaves it null, so each surface owns its own progress.
  const pendingMemberId = addSigner.isPending
    ? (addSigner.variables?.targetIdentity.userId ?? null)
    : null;

  const identity = { identifyBy: "email" as const, value: email };
  const validationError = identityInputError(identity);
  // Only once they have typed something - an untouched form is not an error.
  const shownError = email.trim() ? validationError : null;

  const submit = async (
    targetIdentity: ReturnType<typeof buildTargetIdentity>,
    identifiedBy: string,
  ) => {
    setNotLanded(false);
    try {
      const { addedUserId } = await addSigner.mutateAsync({
        businessAccountId,
        wallet,
        targetIdentity,
        identifiedBy,
      });
      // The call can report success and leave no signer row - staying here with
      // that said out loud beats navigating to a roster the signer is missing
      // from, which reads as the list being wrong.
      if (!addedUserId) {
        setNotLanded(true);
        return;
      }
      // Back to the roster this was launched from, so the new signer's row is
      // the first thing seen - the wallet list cannot show that.
      navigation.goToWalletSigners(businessAccountId, wallet);
    } catch {
      // Rendered below - covers both a declined step-up and a failed reshare.
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (validationError) return;
    void submit(buildTargetIdentity(identity), "email");
  };

  return (
    // Same header as the signers screen this opens from, retitled: the wallet
    // is the subject of both, and a row repeating its address below the header
    // said it twice.
    <WidgetCard
      title="Add a signer"
      subtitle={truncateAddress(wallet.publicKey ?? wallet.id)}
      onBack={() => navigation.goToWalletSigners(businessAccountId, wallet)}
      trailing={
        navigation.closeToRoot && (
          <IconButton label="Close settings" onClick={navigation.closeToRoot}>
            <X className="h-4 w-4" strokeWidth={1.5} />
          </IconButton>
        )
      }
      className="overflow-visible"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <div className="flex flex-col gap-2">
          {/* The count is of candidates, not of the roster: signer rows are per
              wallet, so a member already signing for THIS wallet is filtered
              out. Labelling it "Account members" made that read as the account
              having lost members. */}
          <SectionLabel count={candidates.length}>
            Members who don&apos;t sign for this wallet
          </SectionLabel>

          {isLoading && (
            <div className="flex min-h-16 items-center justify-center">
              <Spinner />
            </div>
          )}

          {!isLoading && candidates.length === 0 && (
            <EmptyState>
              Every member already signs for this wallet.
            </EmptyState>
          )}

          {candidates.map((member) => {
            // Not `email` - that is the form field's state.
            const memberEmail = emailFor(member.userId);
            const pending = pendingMemberId === member.userId;
            return (
              <button
                key={member.id}
                type="button"
                disabled={addSigner.isPending}
                // `targetIdentity.userId` names a known Dynamic user directly,
                // so a member needs no identifier typed for them.
                onClick={() => void submit({ userId: member.userId }, "userId")}
                className="flex w-full items-center gap-2.5 rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) px-3 py-2 text-left transition-colors hover:bg-(--brand-row-hover) disabled:cursor-default disabled:opacity-60"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-(--brand-primary)/10 text-(--brand-primary)">
                  <UserRound className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
                {memberEmail ? (
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-(--brand-fg)">
                    {memberEmail}
                  </span>
                ) : (
                  // Full contrast, not `Mono`'s muted default: an id here is
                  // the row's identity, same as the email it stands in for.
                  <Mono
                    title={member.userId}
                    className="min-w-0 flex-1 text-(--brand-fg)"
                  >
                    {shorten(member.userId)}
                  </Mono>
                )}
                {/* No role pill. A member's administrative role says nothing
                    about whether they should sign - keeping the two separate is
                    the point of the feature, and showing "viewer" next to a
                    signing choice invites exactly the wrong inference. */}
                {pending && <Spinner />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-(--brand-border)" />
          <span className="text-[11px] text-(--brand-muted)">
            or someone not on the account
          </span>
          <span className="h-px flex-1 bg-(--brand-border)" />
        </div>

        <Input
          label="Email"
          type="email"
          noAutofill
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="teammate@example.com"
          disabled={addSigner.isPending}
          error={shownError ?? undefined}
        />

        <p className="text-[11px] leading-relaxed text-(--brand-muted)">
          If no Dynamic user matches, one is created. Signing is all they get -
          being a signer grants no admin rights on the account.
        </p>

        {/* Spins only for its own submission. A member picked from the list
            above already spins in that row, and a second spinner down here
            made one add look like two. */}
        <Button
          type="submit"
          className="w-full"
          loading={addSigner.isPending && !pendingMemberId}
          disabled={Boolean(validationError) || addSigner.isPending}
        >
          Add signer
        </Button>

        <ErrorMessage error={addSigner.error} />

        {notLanded && !addSigner.isPending && (
          <p className="text-xs leading-relaxed text-red-500">
            The reshare reported success, but the account came back without a
            new signer for this wallet. Nothing was added.
          </p>
        )}
      </form>
    </WidgetCard>
  );
}
