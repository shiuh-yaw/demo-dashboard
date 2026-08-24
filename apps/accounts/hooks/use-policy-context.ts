"use client";

/**
 * Everything a policy screen needs to address one layer.
 *
 * Four screens - the type hub, addresses, transaction limits, and the
 * destination editor - all answer the same questions first: which layer, on
 * which network, denominated in what, and may this user change it. Deriving
 * that in one place is what keeps them from disagreeing.
 */

import { useMemo } from "react";
import { useBusinessAccount } from "@/hooks/use-business-accounts";
import { useCurrentUserId } from "@/hooks/use-current-user-id";
import {
  useAccountWalletAccounts,
  useActiveNetwork,
} from "@/hooks/use-wallet-accounts";
import { canManageMembers, signersOf } from "@/lib/business-accounts/view";
import { capAssetsFor, type CapAsset } from "@/lib/cap-assets";
import { findSignableWallet } from "@/lib/dynamic";
import type { BusinessAccountWalletSummary } from "@/lib/dynamic";
import type { PolicyTarget } from "@/lib/dynamic/policies";

/** Set when a screen is showing one signer's layer rather than the wallet's. */
export interface PolicySigner {
  shareSetId: string;
  label: string;
}

export interface PolicyContext {
  /**
   * Null when this session holds no share for the wallet: the SDK's rule
   * helpers are addressed by wallet account, so there is no layer to read.
   */
  target: PolicyTarget | null;
  chain: string;
  chainIds: number[];
  assets: CapAsset[];
  editable: boolean;
  address: string;
  /** False while the network - and so the chain id every rule is scoped to - is still resolving. */
  isReady: boolean;
}

export function usePolicyContext({
  businessAccountId,
  wallet,
  signer,
}: {
  businessAccountId: string;
  wallet: BusinessAccountWalletSummary;
  signer?: PolicySigner;
}): PolicyContext {
  const { detail } = useBusinessAccount(businessAccountId);
  const userId = useCurrentUserId();
  const { walletAccounts } = useAccountWalletAccounts(businessAccountId);
  const signable = findSignableWallet(walletAccounts, wallet);
  const { networkData } = useActiveNetwork(signable);

  const chain = signable?.chain ?? wallet.chain ?? "EVM";

  // Rules do not follow a wallet across chains, so the network on screen is
  // part of every read and write. A network whose id isn't numeric has no
  // chain id to scope a rule to.
  const chainId = Number(networkData?.networkId);
  const chainIds = useMemo(
    () => (Number.isFinite(chainId) ? [chainId] : []),
    [chainId],
  );

  const nativeCurrency = networkData?.nativeCurrency;
  const assetChainId = chainIds[0] ?? null;
  // Memoized: a fresh array every render would re-run the cap field's seeding
  // effect and overwrite whatever the user is typing.
  const assets = useMemo(
    () => capAssetsFor({ chainId: assetChainId, nativeCurrency }),
    [assetChainId, nativeCurrency],
  );

  const canEditWallet = canManageMembers(detail, userId);
  // A signer's own layer is theirs to set; an owner or admin can set anyone's.
  const isMine = signersOf(detail, wallet.id).some(
    (row) => row.shareSetId === signer?.shareSetId && row.userId === userId,
  );

  const target = useMemo<PolicyTarget | null>(() => {
    if (!signable) return null;
    if (signer) {
      return {
        kind: "signer",
        walletAccount: signable,
        shareSetId: signer.shareSetId,
      };
    }
    return { kind: "wallet", walletAccount: signable };
  }, [signable, signer]);

  return {
    target,
    chain,
    chainIds,
    assets,
    editable: signer ? isMine || canEditWallet : canEditWallet,
    address: signable?.address ?? wallet.publicKey ?? wallet.id,
    isReady: chainIds.length > 0,
  };
}
