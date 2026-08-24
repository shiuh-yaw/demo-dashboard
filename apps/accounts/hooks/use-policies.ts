"use client";

/**
 * A policy layer, and the writes that change one rule of it.
 *
 * Keyed per (layer, chain, chainIds) because rules are chain-scoped: the same
 * wallet can carry different limits on different networks, so the network the
 * screen is showing is part of the key. Every mutation returns the layer as it
 * now stands, so the cache adopts the enclave's answer rather than refetching
 * what it just said.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMilestone } from "@/hooks/use-milestone";
import {
  getPolicyLayer,
  removePolicyRule,
  saveAssetLimit,
  saveDestinationRule,
  type DestinationRule,
  type PolicyCap,
  type PolicyLayerView,
  type PolicyTarget,
} from "@/lib/dynamic/policies";

function targetId(target: PolicyTarget): string {
  if (target.kind === "account") return target.businessAccountId;
  if (target.kind === "wallet") return target.walletAccount.id;
  return `${target.walletAccount.id}:${target.shareSetId ?? "self"}`;
}

function key(target: PolicyTarget | null, chain: string, chainIds: number[]) {
  return [
    "policy-layer",
    target?.kind ?? "none",
    target ? targetId(target) : "none",
    chain,
    chainIds.join(","),
  ] as const;
}

/**
 * A wallet the caller holds no share for has no layer to read: the SDK's
 * rule-level helpers are addressed by wallet account, not by id. The screens
 * pass `null` for that case and say so on screen.
 */
function required(target: PolicyTarget | null): PolicyTarget {
  if (!target) throw new Error("No policy layer for this wallet.");
  return target;
}

export function usePolicyLayer({
  target,
  chain,
  chainIds,
  enabled = true,
}: {
  target: PolicyTarget | null;
  chain: string;
  chainIds: number[];
  enabled?: boolean;
}) {
  const query = useQuery({
    queryKey: key(target, chain, chainIds),
    queryFn: () =>
      getPolicyLayer({ target: required(target), chain, chainIds }),
    enabled: enabled && Boolean(target) && chainIds.length > 0,
    // The layer a user just wrote is the layer they are looking at; nothing
    // else moves it while this screen is open.
    staleTime: 30 * 1000,
  });

  return {
    layer: query.data as PolicyLayerView | undefined,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * The three writes a layer takes, sharing one cache entry and one milestone.
 *
 * Together rather than three hooks: the list screen and the editor both need
 * more than one of them, and each returns the same layer to adopt.
 */
export function usePolicyWrites({
  target,
  chain,
  chainIds,
}: {
  target: PolicyTarget | null;
  chain: string;
  chainIds: number[];
}) {
  const queryClient = useQueryClient();
  const milestone = useMilestone();

  const adopt = (layer: PolicyLayerView) => {
    queryClient.setQueryData(key(target, chain, chainIds), layer);
  };

  const saveDestination = useMutation({
    mutationFn: (rule: DestinationRule) =>
      saveDestinationRule({ target: required(target), rule, chain, chainIds }),
    onSuccess: (layer, rule) => {
      // Which layer and what kind of rule, never an address or an amount.
      milestone("policy_updated", {
        layer: target?.kind ?? "none",
        rule: rule.mode,
      });
      adopt(layer);
    },
  });

  const saveLimit = useMutation({
    mutationFn: ({ cap, ruleId }: { cap: PolicyCap; ruleId?: string }) =>
      saveAssetLimit({ target: required(target), cap, ruleId, chain, chainIds }),
    onSuccess: (layer, { cap }) => {
      milestone("policy_updated", {
        layer: target?.kind ?? "none",
        // Whether the ceiling is on the native coin or a token, never which.
        rule: cap.asset ? "token_limit" : "native_limit",
      });
      adopt(layer);
    },
  });

  const removeRule = useMutation({
    mutationFn: (ruleId: string) =>
      removePolicyRule({ target: required(target), ruleId, chain, chainIds }),
    onSuccess: (layer) => {
      milestone("policy_updated", {
        layer: target?.kind ?? "none",
        rule: "removed",
      });
      adopt(layer);
    },
  });

  return { saveDestination, saveLimit, removeRule };
}
