/**
 * WalletConnect catalog helpers.
 *
 * The raw catalog from `getWalletConnectCatalog()` returns one entry
 * per (wallet × chain) pair — Phantom EVM + Phantom SOL + Phantom
 * Bitcoin all surface as separate `WalletConnectCatalogWallet` rows.
 * `buildCatalogGroups` collapses those into one row per vendor (using
 * the SDK's `groupId` + `groups[…]` taxonomy when available) so the
 * picker shows "Phantom" once with three chain badges rather than
 * three duplicate "Phantom" rows.
 *
 * Mirrors the grouping logic from the SDK's react-demo:
 * apps/react-demo/src/app/components/walletConnect/WalletConnectWalletList.tsx
 */

import type {
  WalletConnectCatalog,
  WalletConnectCatalogWallet,
} from "@dynamic-labs-sdk/client";

/** One picker row — a vendor with one or more chain variants. */
export interface CatalogGroup {
  /** Stable id — `groupId` from the catalog, or the wallet key if ungrouped. */
  id: string;
  /** Display name — group label when present, else the wallet's own name. */
  name: string;
  /** Group sprite (falls back to the first wallet's sprite). */
  spriteUrl: string | null;
  /**
   * Every chain variant under this vendor. Always has length ≥ 1.
   * Use {@link pickWalletForChain} to choose the right one at click
   * time based on the host's preferred chain.
   */
  wallets: WalletConnectCatalogWallet[];
}

export interface BuildCatalogGroupsOptions {
  /**
   * If set, drops vendors whose entries don't match any of these
   * chains. Empty array or undefined keeps every chain.
   */
  chains?: ReadonlyArray<string>;
  /** Substring filter on group/wallet name (case-insensitive). */
  query?: string;
}

/**
 * Collapse the raw catalog into per-vendor groups.
 *
 * Filters are applied in this order:
 *   1. `chains` — drop wallets whose chain isn't in the allow-list
 *   2. group by `groupId` (or wallet key as fallback)
 *   3. `query` — substring match on either the group name or any of
 *      the wallet names inside it
 *
 * Output is alphabetically sorted by group name; chain ordering
 * within a group preserves the SDK's emission order.
 */
export function buildCatalogGroups(
  catalog: WalletConnectCatalog | null,
  options: BuildCatalogGroupsOptions = {},
): CatalogGroup[] {
  if (!catalog) return [];

  const chains = options.chains;
  const query = options.query?.trim().toLowerCase() ?? "";
  const byId = new Map<string, CatalogGroup>();

  for (const [walletKey, wallet] of Object.entries(catalog.wallets)) {
    if (chains && chains.length > 0 && !chains.includes(wallet.chain)) {
      continue;
    }
    const groupId = wallet.groupId || walletKey;
    const existing = byId.get(groupId);
    if (existing) {
      existing.wallets.push(wallet);
      continue;
    }
    const groupMeta = catalog.groups?.[groupId];
    byId.set(groupId, {
      id: groupId,
      name: groupMeta?.name || wallet.name,
      spriteUrl: groupMeta?.spriteUrl || wallet.spriteUrl || null,
      wallets: [wallet],
    });
  }

  let groups = Array.from(byId.values());

  if (query) {
    groups = groups.filter((g) => {
      if (g.name.toLowerCase().includes(query)) return true;
      return g.wallets.some((w) => w.name.toLowerCase().includes(query));
    });
  }

  groups.sort((a, b) => a.name.localeCompare(b.name));
  return groups;
}

/**
 * Pick the best wallet variant from a group for a given preferred
 * chain. Falls back to the first wallet when the preferred chain
 * isn't represented — host UI should treat that as "we'll route
 * through the only chain this wallet supports."
 */
export function pickWalletForChain(
  group: CatalogGroup,
  preferredChain: string,
): WalletConnectCatalogWallet {
  return (
    group.wallets.find((w) => w.chain === preferredChain) ?? group.wallets[0]!
  );
}
