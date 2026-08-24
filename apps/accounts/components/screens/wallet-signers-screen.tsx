"use client";

/**
 * Who can sign for one wallet.
 *
 * Reached from the wallet's transactions screen rather than sitting on the way
 * in: managing signers is administration, and a wallet is opened to use it.
 *
 * This screen is where the admin/signer split stops being an abstraction. The
 * roster below comes from the account, so every member can read it, while the
 * Send button on the previous screen appears only when `getWalletAccounts()`
 * returned a match - which happens only for a user holding a share. An admin
 * who is not a signer manages this list and cannot move a cent.
 */

import { Plus, X } from "lucide-react";
import { Button, IconButton, Spinner, Tooltip, WidgetCard } from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import {
  ConfirmPair,
  EmptyState,
  Mono,
  Pill,
  SectionLabel,
} from "@/components/ui/atoms";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { useAuthenticatedIdentity } from "@/hooks/use-authenticated-identity";
import {
  useBusinessAccount,
  useRemoveSigner,
} from "@/hooks/use-business-accounts";
import { useConfirm } from "@/hooks/use-confirm";
import { useMemberEmails } from "@/hooks/use-member-emails";
import { useAccountWalletAccounts } from "@/hooks/use-wallet-accounts";
import {
  canAddSigner,
  canRemoveSigner,
  shorten,
  signersOf,
} from "@/lib/business-accounts/view";
import { findSignableWallet } from "@/lib/dynamic";
import type { BusinessAccountWalletSummary } from "@/lib/dynamic";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function WalletSignersScreen({
  businessAccountId,
  wallet,
  navigation,
}: {
  businessAccountId: string;
  wallet: BusinessAccountWalletSummary;
  navigation: NavigationReturn;
}) {
  // `wallets`, not `transactions`: this screen's action is a wallet's roster,
  // not moving value.
  usePanelSectionEffect("wallets");

  const { detail, isLoading, error } = useBusinessAccount(businessAccountId);
  const identity = useAuthenticatedIdentity();
  const userId = identity?.dynamicUserId ?? null;
  const emailFor = useMemberEmails(businessAccountId);
  const removeSigner = useRemoveSigner();
  const confirming = useConfirm();

  const { walletAccounts } = useAccountWalletAccounts(businessAccountId);
  const signable = findSignableWallet(walletAccounts, wallet);

  const signers = signersOf(detail, wallet.id);
  const address = wallet.publicKey ?? signable?.address ?? wallet.id;
  const canAdd = canAddSigner(detail, userId, wallet);

  return (
    <WidgetCard
      title="Signers"
      subtitle={truncateAddress(address)}
      onBack={() => navigation.goToWalletSettings(businessAccountId, wallet)}
      trailing={
        navigation.closeToRoot && (
          <IconButton label="Close settings" onClick={navigation.closeToRoot}>
            <X className="h-4 w-4" strokeWidth={1.5} />
          </IconButton>
        )
      }
      className="overflow-visible"
    >
      <div className="flex flex-col gap-3">
        <SectionLabel count={signers.length}>
          Can sign for this wallet
        </SectionLabel>

        {isLoading && (
          <div className="flex min-h-32 items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}

        <ErrorMessage error={error} />

        {!isLoading && signers.length === 0 && (
          <EmptyState>
            No signers on this wallet yet. Add one to give a teammate their own
            share.
          </EmptyState>
        )}

        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {signers.map((signer) => (
            <div
              key={signer.id}
              className="flex shrink-0 items-center gap-2 rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) px-3 py-2.5"
            >
              {/* The row opens this signer's own policy layer: rules belong to
                  the signer they bind, not to a screen listing everyone. */}
              <button
                type="button"
                disabled={!signer.shareSetId}
                onClick={() =>
                  signer.shareSetId &&
                  navigation.goToWalletPolicies(businessAccountId, wallet, {
                    shareSetId: signer.shareSetId,
                    label:
                      emailFor(signer.userId) ??
                      shorten(signer.userId ?? signer.id),
                  })
                }
                className="min-w-0 flex-1 text-left disabled:cursor-default"
              >
                {emailFor(signer.userId) ? (
                  <span
                    title={signer.userId ?? undefined}
                    className="block truncate text-xs text-(--brand-fg)"
                  >
                    {emailFor(signer.userId)}
                  </span>
                ) : (
                  <Mono
                    title={signer.userId ?? signer.id}
                    className="min-w-0 text-(--brand-fg)"
                  >
                    {shorten(signer.userId ?? signer.id)}
                  </Mono>
                )}
              </button>

              {/* Status steps aside mid-decision: it is not what the reader
                  needs while choosing, and it crowds the two buttons that
                  are. */}
              {!confirming.isArmed(`signer:${signer.id}`) && (
                <>
                  {signer.userId === userId && <Pill tone="you">you</Pill>}
                  {signer.type === "server" && <Pill>server</Pill>}
                  <Pill tone={signer.shareSetId ? "active" : "pending"}>
                    {signer.shareSetId ? "active" : "pending"}
                  </Pill>
                </>
              )}

              {canRemoveSigner(detail, wallet) &&
                (confirming.isArmed(`signer:${signer.id}`) ? (
                  <ConfirmPair
                    label="Revoke"
                    pending={removeSigner.isPending}
                    onCancel={confirming.disarm}
                    onConfirm={() =>
                      void removeSigner
                        .mutateAsync({
                          businessAccountId,
                          walletId: signer.walletId,
                          signerId: signer.id,
                        })
                        .catch(() => {
                          // Rendered below from the mutation's error.
                        })
                        .finally(confirming.disarm)
                    }
                  />
                ) : (
                  <Tooltip content="Revoke signer">
                    <Button
                      variant="ghost"
                      size="sm"
                      danger
                      className="w-8 shrink-0 px-0"
                      aria-label="Revoke signer"
                      onClick={() => confirming.arm(`signer:${signer.id}`)}
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                    </Button>
                  </Tooltip>
                ))}
            </div>
          ))}
        </div>

        {canAdd && (
          <div className="mt-1 border-t border-(--brand-border) pt-3">
            <Button
              className="w-full"
              onClick={() => navigation.goToAddSigner(businessAccountId, wallet)}
            >
              <Plus className="h-4 w-4" />
              Add signer
            </Button>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-(--brand-muted)">
          Open a signer to set the rules that bind them. Revoking severs only
          that signer&apos;s share; the wallet and its other signers are
          untouched.
        </p>

        <ErrorMessage error={removeSigner.error} />
      </div>
    </WidgetCard>
  );
}
