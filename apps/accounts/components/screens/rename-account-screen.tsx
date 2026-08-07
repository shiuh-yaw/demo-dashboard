"use client";

/**
 * Edit an account.
 *
 * Only `name` is savable: `UpdateBusinessAccountSdkRequest` declares `name`
 * alone, and the PATCH endpoint documents the same, so `externalRef` and the
 * website are set at creation and immutable afterwards. They are shown read-only
 * rather than hidden - the values matter, and a disabled input that silently
 * discarded an edit would be worse than saying so.
 *
 * There is no delete, either: the generated `SDKApi` has 42 business-account
 * methods and not one removes an account. Hiding is offered in its place and is
 * labelled as exactly what it is - a change to this browser's list, not to the
 * account.
 */

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input, WidgetCard } from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/error-message";
import { AccountAvatar } from "@/components/ui/account-avatar";
import { Mono } from "@/components/ui/atoms";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import {
  useBusinessAccount,
  useRenameAccount,
} from "@/hooks/use-business-accounts";
import { useHiddenAccounts } from "@/hooks/use-hidden-accounts";
import { readAccountAvatar } from "@/lib/business-accounts/avatar";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function RenameAccountScreen({
  businessAccountId,
  currentName,
  navigation,
}: {
  businessAccountId: string;
  currentName: string;
  navigation: NavigationReturn;
}) {
  usePanelSectionEffect("rename");

  const [name, setName] = useState(currentName);
  const { detail } = useBusinessAccount(businessAccountId);
  const rename = useRenameAccount();

  const website = readAccountAvatar(detail?.metadata).websiteUrl;
  const { isHidden, setHidden } = useHiddenAccounts();
  const hidden = isHidden(businessAccountId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      await rename.mutateAsync({ businessAccountId, name: name.trim() });
      navigation.goToAccount(businessAccountId);
    } catch {
      // Rendered below from the mutation's error.
    }
  };

  return (
    <WidgetCard
      title="Edit account"
      subtitle="Owner and admin only"
      onBack={() => navigation.goToAccount(businessAccountId)}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          noAutofill
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Acme Treasury"
          autoFocus
          disabled={rename.isPending}
        />

        <div className="flex flex-col gap-2 rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) px-3 py-2.5">
          <span className="text-xs font-medium text-(--brand-fg)">
            Set at creation
          </span>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-(--brand-muted)">External ID</span>
            {detail?.externalRef ? (
              <Mono title={detail.externalRef}>{detail.externalRef}</Mono>
            ) : (
              <span className="text-xs italic text-(--brand-muted)">none</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-(--brand-muted)">Website</span>
            <span className="flex min-w-0 items-center gap-2">
              {website ? (
                <>
                  <Mono title={website}>{website}</Mono>
                  <AccountAvatar
                    name={detail?.name}
                    metadata={detail?.metadata}
                    className="h-6 w-6 rounded-md"
                  />
                </>
              ) : (
                <span className="text-xs italic text-(--brand-muted)">none</span>
              )}
            </span>
          </div>

        </div>

        <Button
          type="submit"
          className="w-full"
          loading={rename.isPending}
          disabled={!name.trim() || name.trim() === currentName}
        >
          Save
        </Button>

        <ErrorMessage error={rename.error} />
      </form>

      {/* Outside the form: it changes nothing on the server, so it must not
          look like it saves alongside the name. Local to this browser - see
          `lib/business-accounts/hidden-accounts.ts` for why this is hiding
          rather than deleting. The UI does not spell that out: this is a demo,
          and copy about what the API lacks belongs in the code, not on screen. */}
      <div className="mt-4 border-t border-(--brand-border) pt-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setHidden(businessAccountId, !hidden)}
        >
          {hidden ? (
            <>
              <Eye className="h-4 w-4" />
              Show in your list
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4" />
              Hide from your list
            </>
          )}
        </Button>
      </div>
    </WidgetCard>
  );
}
