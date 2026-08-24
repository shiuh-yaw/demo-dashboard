"use client";

/**
 * Add a member, by email only.
 *
 * The SDK accepts five other identifier types (phone, external id, the two
 * social ones, a known Dynamic user id) and `lib/business-accounts/identity.ts`
 * still models all of them for the signer flow. This form offers just the email
 * because it is the one identifier the app can read back: the roster the server
 * returns carries no identifier at all, so an address typed here is what lets
 * the members list show a person instead of a uuid.
 */

import { X } from "lucide-react";
import { useState } from "react";
import { Button, IconButton, Input, SelectMenu, WidgetCard } from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/error-message";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { useAddMember } from "@/hooks/use-business-accounts";
import {
  buildTargetIdentity,
  identityInputError,
} from "@/lib/business-accounts/identity";
import { ROLE_OPTIONS } from "@/lib/business-accounts/roles";
import type { AssignableRole } from "@/lib/dynamic";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function AddMemberScreen({
  businessAccountId,
  navigation,
}: {
  businessAccountId: string;
  navigation: NavigationReturn;
}) {
  usePanelSectionEffect("members");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("viewer");
  const addMember = useAddMember();

  const identity = { identifyBy: "email" as const, value: email };
  const validationError = identityInputError(identity);
  // Only after they have typed something - an empty form should not read as
  // an error before it has been touched.
  const shownError = email.trim() ? validationError : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validationError) return;
    try {
      await addMember.mutateAsync({
        businessAccountId,
        targetIdentity: buildTargetIdentity(identity),
        role,
        identifiedBy: "email",
      });
      navigation.goToMembers(businessAccountId);
    } catch {
      // Rendered below - covers both a declined step-up and a failed add.
    }
  };

  return (
    <WidgetCard
      title="Add a member"
      subtitle="Administers the account, not its wallets"
      onBack={() => navigation.goToMembers(businessAccountId)}
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
        <Input
          label="Email"
          type="email"
          noAutofill
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="teammate@example.com"
          autoFocus
          disabled={addMember.isPending}
          error={shownError ?? undefined}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="member-role"
            className="text-xs font-medium text-(--brand-fg)"
          >
            Role
          </label>
          <SelectMenu
            id="member-role"
            className="h-10"
            value={role}
            disabled={addMember.isPending}
            options={ROLE_OPTIONS}
            onChange={setRole}
          />
        </div>

        <p className="text-[11px] leading-relaxed text-(--brand-muted)">
          If no Dynamic user matches, one is created. To let them sign, add them
          as a signer on a specific wallet as well.
        </p>

        <Button
          type="submit"
          className="w-full"
          loading={addMember.isPending}
          disabled={Boolean(validationError)}
        >
          Add member
        </Button>

        <ErrorMessage error={addMember.error} />
      </form>
    </WidgetCard>
  );
}
