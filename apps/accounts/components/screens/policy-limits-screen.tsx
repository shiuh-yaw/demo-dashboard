"use client";

/**
 * How much may move in one transaction, one row per asset.
 *
 * One rule holds one `valueLimit`, so a ceiling on ETH says nothing about USDC
 * and the two are separate rules - which is why this is a list rather than one
 * amount with an asset picker beside it. Picking an asset that already has a
 * limit fills its amount in and the button changes to Update, so the same
 * control adds a new asset or edits an existing one without ever silently
 * overwriting a different token's rule.
 */

import { useCallback } from "react";
import { Coins, Trash2, X } from "lucide-react";
import { Button, IconButton, Spinner, Tooltip, WidgetCard } from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import { ErrorMessage } from "@/components/error-message";
import { CapAmountField } from "@/components/policy/cap-amount-field";
import { MissingLayerNotice } from "@/components/policy/missing-layer-notice";
import {
  ConfirmPair,
  EmptyState,
  Row,
  SectionLabel,
} from "@/components/ui/atoms";
import { usePanelSectionEffect } from "@/contexts/panel-section-context";
import { useCapAmount } from "@/hooks/use-cap-amount";
import { useConfirm } from "@/hooks/use-confirm";
import { usePolicyLayer, usePolicyWrites } from "@/hooks/use-policies";
import {
  usePolicyContext,
  type PolicySigner,
} from "@/hooks/use-policy-context";
import { toDisplayUnits } from "@/lib/amounts";
import { findCapAsset, type CapAsset } from "@/lib/cap-assets";
import { assetKeyOf } from "@/lib/cap-value";
import type { BusinessAccountWalletSummary } from "@/lib/dynamic";
import type { PolicyCap } from "@/lib/dynamic/policies";
import type { NavigationReturn } from "@/hooks/use-navigation";

/** "10 ETH" plus its icon - or the raw count for an unknown asset. */
export function limitSummary(
  cap: PolicyCap,
  assets: readonly CapAsset[],
): { label: string; iconUrl?: string } {
  const asset = findCapAsset(assets, cap.asset);
  if (asset) {
    return {
      label: `${toDisplayUnits(cap.amount, asset.decimals)} ${asset.symbol}`,
      iconUrl: asset.iconUrl,
    };
  }
  return { label: `${cap.amount} of ${truncateAddress(cap.asset ?? "")}` };
}

export function PolicyLimitsScreen({
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

  const { target, chain, chainIds, assets, editable, address, isReady } =
    usePolicyContext({ businessAccountId, wallet, signer });

  const { layer, isLoading, error } = usePolicyLayer({
    target,
    chain,
    chainIds,
  });
  const writes = usePolicyWrites({ target, chain, chainIds });
  const confirming = useConfirm();

  const limits = layer?.assetLimits ?? [];

  /** The stored limit for an asset, matched by the select's own key. */
  const limitMatching = useCallback(
    (assetKey: string) =>
      limits.find((limit) => {
        const asset = findCapAsset(assets, limit.cap.asset);
        return asset ? assetKeyOf(asset) === assetKey : false;
      }),
    [limits, assets],
  );

  // Picking an asset fills in what it is already capped at, rather than showing
  // an empty box beside an existing rule.
  const limitFor = useCallback(
    (assetKey: string) => limitMatching(assetKey)?.cap,
    [limitMatching],
  );

  const cap = useCapAmount({ assets, limitFor });

  // Keyed on the CHOSEN asset, not on the built cap: an empty amount builds no
  // cap, and matching on its absent asset made every empty field look like an
  // edit of the native limit.
  const editingRuleId = limitMatching(cap.assetKey)?.ruleId;

  const pending = writes.saveLimit.isPending || writes.removeRule.isPending;

  return (
    <WidgetCard
      icon={<Coins className="h-[18px] w-[18px] text-(--brand-fg)" />}
      title="Transaction limits"
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
        <SectionLabel count={limits.length}>Max per transaction</SectionLabel>

        {!isReady || isLoading ? (
          <div className="flex min-h-24 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            {limits.length === 0 ? (
              <EmptyState>
                No limits. Add one to cap how much of an asset can move in a
                single transaction.
              </EmptyState>
            ) : (
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                {limits.map((limit) => {
                  const summary = limitSummary(limit.cap, assets);
                  const armed = confirming.isArmed(`limit:${limit.ruleId}`);
                  return (
                    <Row key={limit.ruleId} chevron={false}>
                      {summary.iconUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={summary.iconUrl}
                          alt=""
                          aria-hidden="true"
                          className="h-5 w-5 shrink-0 rounded-full"
                        />
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-(--brand-fg)">
                          Up to {summary.label}
                        </span>
                        <span className="text-[11px] text-(--brand-muted)">
                          per transaction
                        </span>
                      </span>
                      {editable &&
                        (armed ? (
                          <ConfirmPair
                            label="Remove"
                            pending={writes.removeRule.isPending}
                            onCancel={confirming.disarm}
                            onConfirm={() =>
                              writes.removeRule.mutate(limit.ruleId, {
                                onSettled: confirming.disarm,
                              })
                            }
                          />
                        ) : (
                          <Tooltip content="Remove this limit">
                            <Button
                              variant="ghost"
                              size="icon"
                              danger
                              className="shrink-0"
                              aria-label="Remove this limit"
                              onClick={() =>
                                confirming.arm(`limit:${limit.ruleId}`)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                        ))}
                    </Row>
                  );
                })}
              </div>
            )}

            {layer?.exists === false ? (
              <MissingLayerNotice />
            ) : editable ? (
              <div className="mt-1 flex flex-col gap-3 border-t border-(--brand-border) pt-3">
                <CapAmountField
                  assets={assets}
                  state={cap}
                  disabled={pending}
                  placeholder="Amount"
                  helperText="Applies to every transaction on this network, whatever the destination."
                />
                <Button
                  className="w-full"
                  loading={pending}
                  onClick={() =>
                    cap.cap &&
                    writes.saveLimit.mutate({
                      cap: cap.cap,
                      ruleId: editingRuleId,
                    })
                  }
                  disabled={!cap.cap || Boolean(cap.error)}
                >
                  {editingRuleId ? "Update limit" : "Add a limit"}
                </Button>
              </div>
            ) : (
              <p className="text-[11px] leading-relaxed text-(--brand-muted)">
                {signer
                  ? "A signer sets their own rules; an owner or admin can set anyone's."
                  : "Only an owner or admin can change the wallet's own rules."}
              </p>
            )}
          </>
        )}

        <ErrorMessage
          error={
            cap.error ?? error ?? writes.saveLimit.error ?? writes.removeRule.error
          }
        />
      </div>
    </WidgetCard>
  );
}
