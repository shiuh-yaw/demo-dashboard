"use client";

/**
 * One destination, and what may go to it.
 *
 * Its own screen rather than a row of fields in the list: a destination is an
 * address plus a decision plus an amount, and at widget width that is more
 * than a row can hold without truncating the address it is about.
 *
 * Allow is the default because a policy layer that names nothing allows
 * everything - naming an address to allow it is what narrows the wallet down
 * to that address. Deny is the exception, and carries no amount: an address
 * either may receive value or may not.
 */

import { useState } from "react";
import { ShieldCheck, Trash2, X } from "lucide-react";
import { Button, IconButton, Input, SegmentedTabs, Tooltip, WidgetCard } from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import { addressPlaceholderFor } from "@/lib/chains";
import { ConfirmPair } from "@/components/ui/atoms";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { useConfirm } from "@/hooks/use-confirm";
import { usePolicyWrites } from "@/hooks/use-policies";
import {
  usePolicyContext,
  type PolicySigner,
} from "@/hooks/use-policy-context";
import type { BusinessAccountWalletSummary } from "@/lib/dynamic";
import type { DestinationRule } from "@/lib/dynamic/policies";
import type { NavigationReturn } from "@/hooks/use-navigation";

const MODES = [
  { value: "allow", label: "Allow" },
  { value: "deny", label: "Deny" },
] as const;

export function PolicyDestinationScreen({
  businessAccountId,
  wallet,
  signer,
  rule,
  navigation,
}: {
  businessAccountId: string;
  wallet: BusinessAccountWalletSummary;
  signer?: PolicySigner;
  /** Absent when adding one. */
  rule?: DestinationRule;
  navigation: NavigationReturn;
}) {
  usePanelSectionEffect("policies");

  const { target, chain, chainIds } = usePolicyContext({
    businessAccountId,
    wallet,
    signer,
  });

  const writes = usePolicyWrites({ target, chain, chainIds });
  const confirming = useConfirm();

  const [address, setAddress] = useState(rule?.address ?? "");
  const [mode, setMode] = useState<"allow" | "deny">(rule?.mode ?? "allow");

  const back = () =>
    navigation.goToPolicyAddresses(businessAccountId, wallet, signer);

  const trimmed = address.trim();
  const canSave = trimmed.length > 0 && chainIds.length > 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    writes.saveDestination.mutate(
      {
        ...(rule?.ruleId ? { ruleId: rule.ruleId } : {}),
        address: trimmed,
        mode,
      },
      { onSuccess: back },
    );
  };

  return (
    <WidgetCard
      icon={<ShieldCheck className="h-[18px] w-[18px] text-(--brand-fg)" />}
      title={rule ? "Destination" : "Add a destination"}
      subtitle={signer ? signer.label : truncateAddress(wallet.publicKey ?? wallet.id)}
      onBack={back}
      trailing={
        navigation.closeToRoot && (
          <IconButton label="Close settings" onClick={navigation.closeToRoot}>
            <X className="h-4 w-4" strokeWidth={1.5} />
          </IconButton>
        )
      }
      className="overflow-visible"
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          label="Address"
          noAutofill
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder={addressPlaceholderFor(chain)}
          mono
          disabled={writes.saveDestination.isPending}
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-(--brand-fg)">
            This address may
          </span>
          <SegmentedTabs
            aria-label="Allow or deny this address"
            options={MODES}
            value={mode}
            onChange={setMode}
          />
          <p className="text-[11px] leading-relaxed text-(--brand-muted)">
            {mode === "allow"
              ? "Allowing an address denies every address you have not allowed."
              : "Nothing may go to this address, whatever the amount."}
          </p>
        </div>

        {/* Save and remove share a row, and arming the removal replaces the
            whole row - the same rule the signer list follows, so nothing
            unrelated is on offer mid-decision. */}
        {confirming.isArmed("destination") && rule?.ruleId ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-(--brand-muted)">
              Remove this rule?
            </span>
            <ConfirmPair
              label="Remove"
              pending={writes.removeRule.isPending}
              onCancel={confirming.disarm}
              onConfirm={() =>
                writes.removeRule.mutate(rule.ruleId as string, {
                  onSuccess: back,
                  onSettled: confirming.disarm,
                })
              }
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button
              type="submit"
              className="min-w-0 flex-1"
              loading={writes.saveDestination.isPending}
              disabled={!canSave}
            >
              {rule ? "Save destination" : "Add destination"}
            </Button>
            {rule?.ruleId && (
              // Square, not the round toolbar icon: it sits against the Save
              // button, and two different corner radii on one row read as a
              // mistake.
              <Tooltip content="Remove this rule">
                <Button
                  variant="secondary"
                  size="icon"
                  danger
                  className="shrink-0"
                  aria-label="Remove this rule"
                  onClick={() => confirming.arm("destination")}
                  disabled={writes.saveDestination.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Tooltip>
            )}
          </div>
        )}

        <ErrorMessage
          error={writes.saveDestination.error ?? writes.removeRule.error}
        />
      </form>
    </WidgetCard>
  );
}
