"use client";

import { useState } from "react";
import { Button, Input, WidgetCard } from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/error-message";
import { AccountAvatar } from "@/components/ui/account-avatar";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { useCreateAccount } from "@/hooks/use-business-accounts";
import { buildAvatarMetadata } from "@/lib/business-accounts/avatar";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function CreateAccountScreen({
  navigation,
}: {
  navigation: NavigationReturn;
}) {
  usePanelSectionEffect("accounts");

  const [name, setName] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [website, setWebsite] = useState("");
  const createAccount = useCreateAccount();

  // Mirrors what `readAccountAvatar` resolves after create, so the preview is
  // exactly the row the list will render.
  const metadata = buildAvatarMetadata({ website });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const account = await createAccount.mutateAsync({
        name: name.trim() || undefined,
        externalRef: externalRef.trim() || undefined,
        metadata,
      });
      navigation.goToAccount(account.id);
    } catch {
      // Rendered below from the mutation's error.
    }
  };

  return (
    <WidgetCard
      title="Create a business account"
      subtitle="You become its first owner"
      onBack={navigation.goToAccounts}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          noAutofill
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Acme Treasury"
          autoFocus
          disabled={createAccount.isPending}
          helperText="Whatever your team will recognize. You can rename it later."
        />

        <Input
          label="External ID (optional)"
          noAutofill
          value={externalRef}
          onChange={(event) => setExternalRef(event.target.value)}
          placeholder="acme-org-42"
          mono
          disabled={createAccount.isPending}
          helperText="Your own ID for this org. A label, not a key - it is not unique."
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-(--brand-fg)">
            Website (optional)
          </span>
          <div className="flex items-center gap-3">
            <AccountAvatar
              name={name}
              metadata={metadata}
              className="h-10 w-10"
            />
            <Input
              value={website}
              noAutofill
              aria-label="Website"
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="acme.com"
              disabled={createAccount.isPending}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={createAccount.isPending}
        >
          Create account
        </Button>

        <ErrorMessage error={createAccount.error} />
      </form>
    </WidgetCard>
  );
}
