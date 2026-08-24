"use client";

/**
 * Where value may go: one row per address, approved or blocked.
 *
 * Approving an address is what narrows a wallet down to it - a layer that names
 * no address allows every address - so the empty state says so rather than
 * reading as "nothing configured yet".
 */

import { Ban, Check, MapPin, Plus, X } from "lucide-react";
import { Button, IconButton, Spinner, WidgetCard } from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import { MissingLayerNotice } from "@/components/policy/missing-layer-notice";
import { EmptyState, Mono, Row, SectionLabel } from "@/components/ui/atoms";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { usePolicyLayer } from "@/hooks/use-policies";
import {
  usePolicyContext,
  type PolicySigner,
} from "@/hooks/use-policy-context";
import type { BusinessAccountWalletSummary } from "@/lib/dynamic";
import type { NavigationReturn } from "@/hooks/use-navigation";

export function PolicyAddressesScreen({
  businessAccountId,
  wallet,
  signer,
  navigation,
}: {
  businessAccountId: string;
  wallet: BusinessAccountWalletSummary;
  signer?: PolicySigner;
  navigation: NavigationReturn;
}) {
  usePanelSectionEffect("policies");

  const { target, chain, chainIds, editable, address, isReady } =
    usePolicyContext({ businessAccountId, wallet, signer });

  const { layer, isLoading, error } = usePolicyLayer({
    target,
    chain,
    chainIds,
  });

  const destinations = layer?.destinations ?? [];

  return (
    <WidgetCard
      icon={<MapPin className="h-[18px] w-[18px] text-(--brand-fg)" />}
      title="Addresses"
      subtitle={signer ? signer.label : truncateAddress(address)}
      onBack={() =>
        navigation.goToWalletPolicies(businessAccountId, wallet, signer)
      }
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
        <SectionLabel count={destinations.length}>
          Approved and blocked
        </SectionLabel>

        {!isReady || isLoading ? (
          <div className="flex min-h-24 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            {destinations.length === 0 ? (
              <EmptyState>
                Anywhere is allowed. Approve an address to allow only the
                addresses you name - or block one outright.
              </EmptyState>
            ) : (
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {destinations.map((rule) => (
                  <Row
                    key={`${rule.ruleId}:${rule.address}`}
                    onClick={
                      editable
                        ? () =>
                            navigation.goToPolicyDestination(
                              businessAccountId,
                              wallet,
                              { signer, rule },
                            )
                        : undefined
                    }
                  >
                    <span
                      className={
                        rule.mode === "deny"
                          ? "flex h-7 w-7 flex-none items-center justify-center rounded-full bg-red-500/10 text-red-500"
                          : "flex h-7 w-7 flex-none items-center justify-center rounded-full bg-(--brand-primary)/10 text-(--brand-primary)"
                      }
                    >
                      {rule.mode === "deny" ? (
                        <Ban className="h-3.5 w-3.5" strokeWidth={2} />
                      ) : (
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <Mono
                        title={rule.address}
                        className="min-w-0 text-(--brand-fg)"
                      >
                        {truncateAddress(rule.address)}
                      </Mono>
                      <span className="text-[11px] text-(--brand-muted)">
                        {rule.mode === "deny" ? "Blocked" : "Approved"}
                      </span>
                    </span>
                  </Row>
                ))}
              </div>
            )}

            {editable && layer?.exists !== false && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() =>
                  navigation.goToPolicyDestination(businessAccountId, wallet, {
                    signer,
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Add an address
              </Button>
            )}

            {layer?.exists === false && <MissingLayerNotice />}

            {!editable && layer?.exists !== false && (
              <p className="text-[11px] leading-relaxed text-(--brand-muted)">
                {signer
                  ? "A signer sets their own rules; an owner or admin can set anyone's."
                  : "Only an owner or admin can change the wallet's own rules."}
              </p>
            )}
          </>
        )}

        <ErrorMessage error={error} />
      </div>
    </WidgetCard>
  );
}
