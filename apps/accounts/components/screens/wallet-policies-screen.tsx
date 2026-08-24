"use client";

/**
 * The kinds of rule a layer can hold, one row each.
 *
 * A hub rather than one long form: the kinds answer different questions (WHERE
 * value may go, HOW MUCH may move at once) and are stored as different rules,
 * so stacking them on one screen made a wall of fields where the reader had to
 * work out which control belonged to which idea. Each row carries its own
 * count, so the shape of a layer is legible before anything is opened.
 */

import { Coins, MapPin, ShieldCheck, X } from "lucide-react";
import { IconButton, Skeleton, Spinner, WidgetCard } from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import { MissingLayerNotice } from "@/components/policy/missing-layer-notice";
import { EmptyState, Row } from "@/components/ui/atoms";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { usePolicyLayer } from "@/hooks/use-policies";
import {
  usePolicyContext,
  type PolicySigner,
} from "@/hooks/use-policy-context";
import type { BusinessAccountWalletSummary } from "@/lib/dynamic";
import type { NavigationReturn } from "@/hooks/use-navigation";

function TypeRow({
  icon,
  title,
  description,
  count,
  isLoading,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  count?: number;
  isLoading: boolean;
  onClick: () => void;
}) {
  return (
    <Row onClick={onClick}>
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-surface,#fff)">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-(--brand-fg)">{title}</span>
        {isLoading ? (
          <Skeleton className="mt-0.5 h-3 w-28 rounded" />
        ) : (
          <span className="text-[11px] text-(--brand-muted)">
            {count === 0 ? description : `${count} set`}
          </span>
        )}
      </span>
    </Row>
  );
}

export function WalletPoliciesScreen({
  businessAccountId,
  wallet,
  signer,
  navigation,
}: {
  businessAccountId: string;
  wallet: BusinessAccountWalletSummary;
  /** Set when opened from a signer row - that signer's own layer. */
  signer?: PolicySigner;
  navigation: NavigationReturn;
}) {
  usePanelSectionEffect("policies");

  const { target, chain, chainIds, address, isReady } = usePolicyContext({
    businessAccountId,
    wallet,
    signer,
  });

  const { layer, isLoading, error } = usePolicyLayer({
    target,
    chain,
    chainIds,
  });

  return (
    <WidgetCard
      icon={<ShieldCheck className="h-[18px] w-[18px] text-(--brand-fg)" />}
      title={signer ? "Signer rules" : "Wallet rules"}
      subtitle={signer ? signer.label : truncateAddress(address)}
      onBack={() =>
        signer
          ? navigation.goToWalletSigners(businessAccountId, wallet)
          : navigation.goToWalletSettings(businessAccountId, wallet)
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
        <p className="text-[11px] leading-relaxed text-(--brand-muted)">
          {signer
            ? "Applies to this signer alone, on top of the wallet's rules - it can tighten them, never loosen them."
            : "Applies to everyone who signs for this wallet."}
        </p>

        {!target ? (
          <EmptyState>
            Rules are read through the wallet itself, so they need a share of
            its key. Ask a signer on this wallet to open them.
          </EmptyState>
        ) : !isReady ? (
          <div className="flex min-h-24 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            <TypeRow
              icon={<MapPin className="h-4 w-4 text-(--brand-fg)" />}
              title="Addresses"
              description="Any destination allowed"
              count={layer?.destinations.length}
              isLoading={isLoading}
              onClick={() =>
                navigation.goToPolicyAddresses(businessAccountId, wallet, signer)
              }
            />

            <TypeRow
              icon={<Coins className="h-4 w-4 text-(--brand-fg)" />}
              title="Transaction limits"
              description="No limit per transaction"
              count={layer?.assetLimits.length}
              isLoading={isLoading}
              onClick={() =>
                navigation.goToPolicyLimits(businessAccountId, wallet, signer)
              }
            />

            {layer?.exists === false && <MissingLayerNotice />}

            {Boolean(layer?.otherRuleCount) && (
              <p className="text-[11px] leading-relaxed text-(--brand-muted)">
                {layer?.otherRuleCount} other rule
                {layer?.otherRuleCount === 1 ? "" : "s"} on this layer are not
                shown here, and nothing on these screens touches them.
              </p>
            )}
          </>
        )}

        <ErrorMessage error={error} />
      </div>
    </WidgetCard>
  );
}
