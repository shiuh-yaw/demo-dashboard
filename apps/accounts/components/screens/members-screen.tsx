"use client";

/**
 * Members and roles - the administrative half of the feature.
 *
 * Actions follow the server's rules rather than hiding failures: the owner row
 * offers no remove (the backend refuses), role changes are offered only to
 * owners and admins, and transfer is owner-only.
 */

import { Crown, UserPlus, UserRound, X } from "lucide-react";
import { Button, CopyButton, IconButton, SelectMenu, Spinner, Tooltip, WidgetCard } from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/error-message";
import {
  ConfirmPair,
  EmptyState,
  Mono,
  Pill,
  SectionLabel,
} from "@/components/ui/atoms";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import {
  useBusinessAccount,
  useRemoveMember,
  useTransferOwnership,
  useUpdateMemberRole,
} from "@/hooks/use-business-accounts";
import { useAuthenticatedIdentity } from "@/hooks/use-authenticated-identity";
import { useConfirm } from "@/hooks/use-confirm";
import { useMemberEmails } from "@/hooks/use-member-emails";
import {
  assignableRole,
  canManageMembers,
  isOwner,
  shorten,
} from "@/lib/business-accounts/view";
import { ROLE_OPTIONS } from "@/lib/business-accounts/roles";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function MembersScreen({
  businessAccountId,
  navigation,
}: {
  businessAccountId: string;
  navigation: NavigationReturn;
}) {
  usePanelSectionEffect("members");

  const { detail, isLoading, error } = useBusinessAccount(businessAccountId);
  const identity = useAuthenticatedIdentity();
  const userId = identity?.dynamicUserId ?? null;
  const emailFor = useMemberEmails(businessAccountId);
  const updateRole = useUpdateMemberRole();
  const transferOwnership = useTransferOwnership();
  const removeMember = useRemoveMember();
  const removing = useConfirm();

  const members = detail?.members ?? [];
  const canManage = canManageMembers(detail, userId);
  const owner = isOwner(detail, userId);
  const mutationError =
    updateRole.error ?? transferOwnership.error ?? removeMember.error;

  return (
    <WidgetCard
      title="Members & roles"
      subtitle="Who administers the account, not who signs"
      onBack={() => navigation.goToAccount(businessAccountId)}
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
        <SectionLabel count={members.length}>Members</SectionLabel>

        {isLoading && (
          <div className="flex min-h-32 items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}

        <ErrorMessage error={error} />

        {!isLoading && members.length === 0 && (
          <EmptyState>No members on this account.</EmptyState>
        )}

        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {members.map((member) => {
            const isMe = member.userId === userId;
            const isOwnerRow = member.role === "owner";
            // The picker's current value, or null when the row gets no picker -
            // one expression so the type carries the authorization decision.
            const editable =
              canManage && !isOwnerRow && !isMe
                ? assignableRole(member.role)
                : null;
            return (
              <div
                key={member.id}
                className="flex items-center gap-2.5 rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) px-3 py-2"
              >
                {/* Anchors the row the way the avatar anchors an account row,
                    and gives the identity somewhere to sit other than the
                    left edge. */}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-(--brand-primary)/10 text-(--brand-primary)">
                  {isOwnerRow ? (
                    <Crown className="h-3.5 w-3.5" strokeWidth={1.75} />
                  ) : (
                    <UserRound className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                </span>

                {/* `BusinessAccountMember` carries `userId` and no identifier,
                    so an address is only known for the signed-in user or for
                    someone invited from this browser (`useMemberEmails`).
                    Anyone else can only be the id. */}
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  {emailFor(member.userId) ? (
                    <span
                      title={member.userId}
                      className="min-w-0 truncate text-xs font-medium text-(--brand-fg)"
                    >
                      {emailFor(member.userId)}
                    </span>
                  ) : (
                    <>
                      <Mono
                        title={member.userId}
                        className="min-w-0 text-(--brand-fg)"
                      >
                        {shorten(member.userId)}
                      </Mono>
                      <CopyButton
                        text={member.userId}
                        size="sm"
                        label="Copy user ID"
                      />
                    </>
                  )}
                  {isMe && <Pill tone="you">you</Pill>}
                </span>

                {editable && removing.isArmed(`remove:${member.id}`) ? (
                  <ConfirmPair
                    label="Remove"
                    pending={removeMember.isPending}
                    onCancel={removing.disarm}
                    onConfirm={() =>
                      void removeMember
                        .mutateAsync({
                          businessAccountId,
                          userId: member.userId,
                        })
                        .catch(() => {
                          // Rendered below from the mutation's error.
                        })
                        .finally(removing.disarm)
                    }
                  />
                ) : editable && removing.isArmed(`transfer:${member.id}`) ? (
                  // Confirmed like a destructive action because it is one for
                  // the caller: it demotes them and the backend ends their
                  // session, so they land back on the sign-in screen.
                  <ConfirmPair
                    label="Transfer"
                    pending={transferOwnership.isPending}
                    onCancel={removing.disarm}
                    onConfirm={() =>
                      void transferOwnership
                        .mutateAsync({
                          businessAccountId,
                          newOwnerUserId: member.userId,
                        })
                        .catch(() => {
                          // Rendered below from the mutation's error.
                        })
                        .finally(removing.disarm)
                    }
                  />
                ) : editable ? (
                  <>
                    <SelectMenu
                      aria-label="Member role"
                      className="w-[92px] shrink-0"
                      align="end"
                      value={editable}
                      disabled={updateRole.isPending}
                      options={ROLE_OPTIONS}
                      onChange={(role) =>
                        void updateRole
                          .mutateAsync({
                            businessAccountId,
                            userId: member.userId,
                            role,
                          })
                          .catch(() => {
                            // Rendered below from the mutation's error.
                          })
                      }
                    />

                    {/* Icon-only past this point: at widget width, two text
                        buttons plus a select either wrap or crush the
                        identity. The tooltip carries the name for sighted
                        users, `aria-label` for everyone else.

                        Tighter gap than the row's, so the two read as one
                        cluster of actions rather than two loose controls. */}
                    <span className="flex shrink-0 items-center gap-0.5">
                      {owner && (
                        <Tooltip content="Make owner">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 shrink-0 px-0"
                            aria-label="Make owner"
                            onClick={() =>
                              removing.arm(`transfer:${member.id}`)
                            }
                          >
                            <Crown className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip content="Remove member">
                        <Button
                          variant="ghost"
                          size="sm"
                          danger
                          className="w-8 shrink-0 px-0"
                          aria-label="Remove member"
                          onClick={() => removing.arm(`remove:${member.id}`)}
                        >
                          <X className="h-4 w-4" strokeWidth={2} />
                        </Button>
                      </Tooltip>
                    </span>
                  </>
                ) : (
                  <Pill tone={isOwnerRow ? "brand" : "neutral"}>
                    {member.role}
                  </Pill>
                )}
              </div>
            );
          })}
        </div>

        {canManage && (
          <div className="mt-1 border-t border-(--brand-border) pt-3">
            <Button
              className="w-full"
              onClick={() => navigation.goToAddMember(businessAccountId)}
            >
              <UserPlus className="h-4 w-4" />
              Add member
            </Button>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-(--brand-muted)">
          Removing a member also removes every signer row they held, so it fails
          if a wallet would be left with none. Transferring ownership demotes you
          to admin and ends your session.
        </p>

        <ErrorMessage error={mutationError} />
      </div>
    </WidgetCard>
  );
}
