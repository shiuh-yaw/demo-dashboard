"use client";

/**
 * The account list - the first thing a signed-in user sees.
 *
 * `listBusinessAccounts` is already scoped to accounts the user is a member of,
 * so there is nothing to filter for visibility here.
 */

import { Building2, Eye, EyeOff, LogOut, Plus } from "lucide-react";
import { Button, IconButton, Spinner, WidgetCard } from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/error-message";
import { AccountAvatar } from "@/components/ui/account-avatar";
import {
  EmptyState,
  Row,
} from "@/components/ui/atoms";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { useHiddenAccounts } from "@/hooks/use-hidden-accounts";
import { useBusinessAccounts } from "@/hooks/use-business-accounts";
import { useLogout } from "@/hooks/use-auth-mutations";
import { accountName } from "@/lib/business-accounts/view";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function AccountsScreen({
  navigation,
  showHidden,
  onShowHiddenChange,
}: {
  navigation: NavigationReturn;
  /** Owned by `AccountsApp` so it survives a trip into an account. */
  showHidden: boolean;
  onShowHiddenChange: (showHidden: boolean) => void;
}) {
  usePanelSectionEffect("accounts");

  const { accounts, isLoading: accountsLoading, error } = useBusinessAccounts(true);
  const logout = useLogout();
  const { isHidden, isLoading: hiddenLoading } = useHiddenAccounts();

  // Both, or the list paints every account and then drops the hidden ones a
  // frame later - the flash is worse than a slightly longer spinner.
  const isLoading = accountsLoading || hiddenLoading;

  const hiddenCount = accounts.filter((account) => isHidden(account.id)).length;
  const visible = showHidden
    ? accounts
    : accounts.filter((account) => !isHidden(account.id));

  return (
    <WidgetCard
      icon={<Building2 className="h-[18px] w-[18px] text-(--brand-fg)" />}
      title="Accounts"
      subtitle="Manage your accounts"
      trailing={
        <IconButton
          label="Sign out"
          onClick={() => void logout.mutateAsync()}
          disabled={logout.isPending}
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
        </IconButton>
      }
    >
      <div className="flex flex-col gap-3">
        {isLoading && (
          <div className="flex min-h-32 items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}

        <ErrorMessage error={error} />

        {!isLoading && !error && accounts.length === 0 && (
          <EmptyState>
            No accounts yet. Create one to bring wallets under it and add
            co-signers from your team.
          </EmptyState>
        )}

        {!isLoading && accounts.length > 0 && visible.length === 0 && (
          <EmptyState>Every account is hidden. Show them to pick one.</EmptyState>
        )}

        {/* Nothing from the list until both requests are in: rendering rows
            beside the spinner is what made the hidden ones flash. */}
        <div
          className={`flex max-h-72 flex-col gap-2 overflow-y-auto ${
            isLoading ? "hidden" : ""
          }`}
        >
          {visible.map((account) => (
            <Row
              key={account.id}
              onClick={() => navigation.goToWallets(account.id)}
            >
              <AccountAvatar name={account.name} metadata={account.metadata} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-(--brand-fg)">
                  {accountName(account)}
                </span>
                {/* Only when set - an id here is noise, and "no external ref"
                    read as a missing feature. */}
                {account.externalRef && (
                  <span className="truncate font-mono text-[11px] text-(--brand-muted)">
                    {account.externalRef}
                  </span>
                )}
              </span>
            </Row>
          ))}

          {/* The last row of the list, not a caption floating beside it: the
              hidden accounts belong to this list, so their toggle keeps the
              list's rhythm. Dashed and muted so it never reads as an account.
              One label for both states - the icon carries the direction, and
              swapping "Show"/"Hide" resized the row. */}
          {hiddenCount > 0 && (
            <Row
              chevron={false}
              onClick={() => onShowHiddenChange(!showHidden)}
              // Shorter than an account row, and gap-2 rather than the row
              // default: this is a control, and matching an account's height
              // gave it the same weight as the things it reveals.
              className="justify-center gap-2 border-dashed py-1.5"
            >
              {showHidden ? (
                <EyeOff
                  className="h-3.5 w-3.5 shrink-0 text-(--brand-muted)"
                  strokeWidth={1.75}
                />
              ) : (
                <Eye
                  className="h-3.5 w-3.5 shrink-0 text-(--brand-muted)"
                  strokeWidth={1.75}
                />
              )}
              <span className="text-xs text-(--brand-muted)">
                {hiddenCount} hidden account{hiddenCount === 1 ? "" : "s"}
              </span>
            </Row>
          )}
        </div>

        <div className="mt-1 border-t border-(--brand-border) pt-3">
          <Button
            className="w-full"
            onClick={navigation.goToCreateAccount}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4" />
            Create account
          </Button>
        </div>
      </div>
    </WidgetCard>
  );
}
