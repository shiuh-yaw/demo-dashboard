/**
 * Morpho Vaults API
 *
 * Fetches listed Morpho Vault V2 from Morpho Blue GraphQL API.
 * Includes deposits, liquidity, exposure (adapters), and APY.
 *
 * @see https://blue-api.morpho.org/graphql
 */

const MORPHO_GRAPHQL_URL = "https://blue-api.morpho.org/graphql";

/** Default chain IDs when none specified (Base, Ethereum, Arbitrum) */
export const DEFAULT_VAULT_CHAIN_IDS = [8453, 1, 42161];

export interface MorphoVaultAdapter {
  address: string;
  assets: string;
  assetsUsd: number | null;
  type: string;
}

export interface MorphoExposureAsset {
  symbol: string;
  logoURI?: string | null;
}

export interface MorphoVault {
  id: string;
  address: string;
  name: string;
  symbol: string;
  chainId: number;
  asset: {
    id: string;
    address?: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string | null;
  };
  state: {
    totalAssets: string;
    totalAssetsUsd: number | null;
    liquidityUsd: number | null;
    dailyApy: number | null;
    netApy: number | null;
    fee: number | null;
  } | null;
  curator?: {
    id: string;
    name: string;
    image?: string | null;
  } | null;
  adapters?: MorphoVaultAdapter[];
  /** Unique underlying assets from adapters (loan + collateral) for Exposure column */
  exposureAssets?: MorphoExposureAsset[];
}

const VAULTS_QUERY = `
  query VaultsQuery($first: Int, $chainIds: [Int!]) {
    vaultV2s(
      first: $first
      where: { chainId_in: $chainIds, listed: true }
      orderBy: TotalAssetsUsd
      orderDirection: Desc
    ) {
      items {
        id
        address
        name
        symbol
        chain { id }
        asset {
          id
          address
          symbol
          name
          decimals
          logoURI
        }
        totalAssets
        totalAssetsUsd
        liquidityUsd
        idleAssetsUsd
        netApy
        curators { items { name } }
        adapters {
          items {
            address
            assets
            assetsUsd
            type
            ... on MorphoMarketV1Adapter {
              positions(first: 3) {
                items {
                  market {
                    loanAsset { symbol logoURI }
                    collateralAsset { symbol logoURI }
                  }
                }
              }
            }
            ... on MetaMorphoAdapter {
              metaMorpho {
                state {
                  allocation {
                    market {
                      loanAsset { symbol logoURI }
                      collateralAsset { symbol logoURI }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

interface GraphQLVault {
  id: string;
  address: string;
  name: string;
  symbol: string;
  chain: { id: number };
  asset: {
    id: string;
    address?: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string | null;
  };
  totalAssets: string | number;
  totalAssetsUsd: number | null;
  liquidityUsd: number | null;
  idleAssetsUsd?: number | null;
  netApy: number | null;
  curators?: { items: Array<{ name: string }> };
  adapters?: {
    items: Array<{
      address: string;
      assets: string | number;
      assetsUsd: number | null;
      type: string;
      positions?: {
        items: Array<{
          market?: {
            loanAsset?: { symbol: string; logoURI?: string | null };
            collateralAsset?: { symbol: string; logoURI?: string | null } | null;
          };
        }>;
      };
      metaMorpho?: {
        state?: {
          allocation?: Array<{
            market?: {
              loanAsset?: { symbol: string; logoURI?: string | null };
              collateralAsset?: { symbol: string; logoURI?: string | null } | null;
            };
          }>;
        };
      };
    }>;
  };
}

function extractExposureAssets(v: GraphQLVault): MorphoExposureAsset[] {
  const seen = new Set<string>();
  const result: MorphoExposureAsset[] = [];

  const add = (asset: { symbol: string; logoURI?: string | null } | null) => {
    if (!asset?.symbol || seen.has(asset.symbol)) return;
    seen.add(asset.symbol);
    result.push({ symbol: asset.symbol, logoURI: asset.logoURI });
  };

  for (const adapter of v.adapters?.items ?? []) {
    if (adapter.positions?.items) {
      for (const pos of adapter.positions.items) {
        add(pos.market?.loanAsset ?? null);
        add(pos.market?.collateralAsset ?? null);
      }
    }
    if (adapter.metaMorpho?.state?.allocation) {
      for (const alloc of adapter.metaMorpho.state.allocation) {
        add(alloc.market?.loanAsset ?? null);
        add(alloc.market?.collateralAsset ?? null);
      }
    }
  }

  if (result.length === 0) {
    add({ symbol: v.asset.symbol, logoURI: v.asset.logoURI });
  }
  return result;
}

interface GraphQLResponse {
  data?: {
    vaultV2s: {
      items: GraphQLVault[];
    };
  };
  errors?: Array<{ message: string }>;
}

export async function getMorphoVaults(params?: {
  chainIds?: number[];
  first?: number;
}): Promise<MorphoVault[]> {
  const chainIds = params?.chainIds ?? DEFAULT_VAULT_CHAIN_IDS;
  const first = params?.first ?? 50;

  const res = await fetch(MORPHO_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: VAULTS_QUERY,
      variables: { first, chainIds },
    }),
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Morpho API error: ${res.status}`);
  }

  const json: GraphQLResponse = await res.json();

  if (json.errors?.length) {
    throw new Error(
      `Morpho GraphQL error: ${json.errors[0]?.message ?? "Unknown"}`,
    );
  }

  const items = json.data?.vaultV2s?.items ?? [];

  return items.map(
    (v): MorphoVault => ({
      id: v.id,
      address: v.address,
      name: v.name,
      symbol: v.symbol,
      chainId: v.chain.id,
      asset: {
        id: v.asset.id,
        address: v.asset.address,
        symbol: v.asset.symbol,
        name: v.asset.name,
        decimals: v.asset.decimals,
        logoURI: v.asset.logoURI,
      },
      state: {
        totalAssets: String(v.totalAssets),
        totalAssetsUsd: v.totalAssetsUsd,
        liquidityUsd: v.liquidityUsd,
        dailyApy: null,
        netApy: v.netApy,
        fee: null,
      },
      curator: v.curators?.items?.[0]
        ? { id: "", name: v.curators.items[0].name, image: null }
        : undefined,
      adapters: v.adapters?.items?.map((a) => ({
        address: a.address,
        assets: String(a.assets),
        assetsUsd: a.assetsUsd,
        type: a.type,
      })),
      exposureAssets: extractExposureAssets(v),
    }),
  );
}

const VAULT_BY_ADDRESS_QUERY = `
  query VaultByAddressQuery($address: String!, $chainId: Int!) {
    vaultV2ByAddress(address: $address, chainId: $chainId) {
      id
      address
      name
      symbol
      chain { id }
      asset {
        id
        address
        symbol
        name
        decimals
        logoURI
      }
      totalAssets
      totalAssetsUsd
      liquidityUsd
      netApy
      curators { items { name } }
      adapters { items { address assets assetsUsd type } }
    }
  }
`;

interface GraphQLVaultDetail {
  id: string;
  address: string;
  name: string;
  symbol: string;
  chain: { id: number };
  asset: {
    id: string;
    address?: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string | null;
  };
  totalAssets: string | number;
  totalAssetsUsd: number | null;
  liquidityUsd: number | null;
  netApy: number | null;
  curators?: { items: Array<{ name: string }> };
  adapters?: { items: Array<{ address: string; assets: string | number; assetsUsd: number | null; type: string }> };
}

export async function getVaultByAddress(
  address: string,
  chainId: number,
): Promise<MorphoVault | null> {
  const res = await fetch(MORPHO_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: VAULT_BY_ADDRESS_QUERY,
      variables: { address, chainId },
    }),
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Morpho API error: ${res.status}`);
  }

  const json: {
    data?: { vaultV2ByAddress: GraphQLVaultDetail | null };
    errors?: Array<{ message: string }>;
  } = await res.json();

  if (json.errors?.length) {
    throw new Error(
      `Morpho GraphQL error: ${json.errors[0]?.message ?? "Unknown"}`,
    );
  }

  const v = json.data?.vaultV2ByAddress;
  if (!v) return null;

  return {
    id: v.id,
    address: v.address,
    name: v.name,
    symbol: v.symbol,
    chainId: v.chain.id,
    asset: {
      id: v.asset.id,
      address: v.asset.address,
      symbol: v.asset.symbol,
      name: v.asset.name,
      decimals: v.asset.decimals,
      logoURI: v.asset.logoURI,
    },
    state: {
      totalAssets: String(v.totalAssets),
      totalAssetsUsd: v.totalAssetsUsd,
      liquidityUsd: v.liquidityUsd,
      dailyApy: null,
      netApy: v.netApy,
      fee: null,
    },
    curator: v.curators?.items?.[0]
      ? { id: "", name: v.curators.items[0].name, image: null }
      : undefined,
    adapters: v.adapters?.items?.map((a) => ({
      address: a.address,
      assets: String(a.assets),
      assetsUsd: a.assetsUsd,
      type: a.type,
    })),
  };
}
