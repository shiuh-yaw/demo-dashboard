"use client";

/**
 * Managing an account, as opposed to using it.
 *
 * Reached from the gear on the account's wallets screen, not on the way in:
 * an account is opened to reach its wallets, and everything here is the
 * paperwork around them. That is why there is no Wallets row - this screen
 * sits BEHIND the wallets, not above them.
 */

import { Pencil, Users } from "lucide-react";
import { Skeleton, Spinner, WidgetCard } from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/error-message";
import { CopyableId, Pill, Row } from "@/components/ui/atoms";
import { AccountAvatar } from "@/components/ui/account-avatar";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { useBusinessAccount } from "@/hooks/use-business-accounts";
import { useCurrentUserId } from "@/hooks/use-current-user-id";
import {
  accountName,
  canManageMembers,
  memberFor,
} from "@/lib/business-accounts/view";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function AccountScreen({
  businessAccountId,
  navigation,
}: {
  businessAccountId: string;
  navigation: NavigationReturn;
}) {
  usePanelSectionEffect("accounts");

  const { detail, isLoading, isPlaceholder, error } =
    useBusinessAccount(businessAccountId);
  const userId = useCurrentUserId();

  const members = detail?.members ?? [];
  const myRole = memberFor(detail, userId)?.role;

  return (
    <WidgetCard
      icon={
        detail ? (
          <AccountAvatar
            name={detail.name}
            metadata={detail.metadata}
            className="h-[30px] w-[30px] rounded-[7px]"
          />
        ) : undefined
      }
      title={detail ? accountName(detail) : "Account"}
      subtitle={
        detail ? (
          // The external ref is the developer's own handle for the account, so
          // it beats the opaque uuid when there is one. Copyable either way.
          <CopyableId
            value={detail.externalRef ?? detail.id}
            label={detail.externalRef ? "Copy external ID" : "Copy account ID"}
          />
        ) : undefined
      }
      onBack={() => navigation.goToWallets(businessAccountId)}
    >
      {isLoading && (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      <ErrorMessage error={error} />

      {detail && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-(--brand-muted)">Your role</span>
            {isPlaceholder ? (
              <Skeleton className="h-[18px] w-14 rounded" />
            ) : myRole ? (
              <Pill tone={myRole === "owner" ? "brand" : "neutral"}>
                {myRole}
              </Pill>
            ) : (
              <Pill tone="pending">not a member</Pill>
            )}

          </div>

          {/* A row rather than the pencil this screen used to carry: it is
              one of two destinations here, and an icon in the header made the
              lesser of them louder than the greater. */}
          {canManageMembers(detail, userId) && (
            <Row
              onClick={() =>
                navigation.goToRenameAccount(
                  businessAccountId,
                  detail.name ?? "",
                )
              }
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-surface,#fff)">
                <Pencil className="h-4 w-4 text-(--brand-fg)" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium text-(--brand-fg)">
                  Edit account
                </span>
                <span className="text-[11px] text-(--brand-muted)">
                  Name, external ID, visibility
                </span>
              </span>
            </Row>
          )}

          <Row onClick={() => navigation.goToMembers(businessAccountId)}>
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-surface,#fff)">
              <Users className="h-4 w-4 text-(--brand-fg)" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium text-(--brand-fg)">
                Members &amp; roles
              </span>
              {isPlaceholder ? (
                <Skeleton className="mt-0.5 h-3 w-20 rounded" />
              ) : (
                <span className="text-[11px] text-(--brand-muted)">
                  {members.length} member{members.length === 1 ? "" : "s"}
                </span>
              )}
            </span>
          </Row>

          <p className="text-[11px] leading-relaxed text-(--brand-muted)">
            Members administer, signers sign. An admin cannot sign, and a signer
            gets no admin rights.
          </p>
        </div>
      )}
    </WidgetCard>
  );
}
