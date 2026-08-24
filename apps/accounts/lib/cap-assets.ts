/**
 * The assets a per-transaction cap can be denominated in.
 *
 * The rule stores `{ amount, asset? }` where `amount` is in the asset's
 * smallest unit and an omitted `asset` means the chain's native coin. So the
 * native option is derived from the network the wallet is on, and only
 * contract-addressed tokens need a table here.
 *
 * Addresses are the canonical mainnet/testnet deployments already used by
 * `apps/flow`; a network absent from the table offers its native coin and the
 * custom-address escape hatch.
 */

/** Number of decimals an ERC-20 uses unless it says otherwise. */
export const DEFAULT_TOKEN_DECIMALS = 18;

export interface CapAsset {
  /** The rule's `asset`. Undefined caps the chain's native coin. */
  address?: string;
  symbol: string;
  name: string;
  decimals: number;
  iconUrl?: string;
}

const USDC_ICON = "https://api.iconify.design/cryptocurrency/usdc.svg";
const USDT_ICON = "https://api.iconify.design/cryptocurrency/usdt.svg";

const usdc = (address: string): CapAsset => ({
  address,
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  iconUrl: USDC_ICON,
});

const usdt = (address: string): CapAsset => ({
  address,
  symbol: "USDT",
  name: "Tether USD",
  decimals: 6,
  iconUrl: USDT_ICON,
});

const TOKENS_BY_CHAIN_ID: Record<number, readonly CapAsset[]> = {
  1: [
    usdc("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
    usdt("0xdAC17F958D2ee523a2206206994597C13D831ec7"),
  ],
  137: [usdc("0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359")],
  8453: [usdc("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")],
  84532: [usdc("0x036CbD53842c5426634e7929541eC2318f3dCF7e")],
  421614: [usdc("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d")],
  11155111: [usdc("0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238")],
};

/** Native coin first, then whichever tokens this network is known to carry. */
export function capAssetsFor({
  chainId,
  nativeCurrency,
}: {
  chainId: number | null;
  nativeCurrency?: {
    symbol: string;
    name: string;
    decimals: number;
    iconUrl?: string;
  };
}): CapAsset[] {
  const native: CapAsset[] = nativeCurrency
    ? [
        {
          symbol: nativeCurrency.symbol,
          name: nativeCurrency.name,
          decimals: nativeCurrency.decimals,
          iconUrl: nativeCurrency.iconUrl,
        },
      ]
    : [];
  const tokens = chainId == null ? [] : (TOKENS_BY_CHAIN_ID[chainId] ?? []);
  return [...native, ...tokens];
}

/** The listed asset an existing rule's `asset` refers to, if it is one. */
export function findCapAsset(
  assets: readonly CapAsset[],
  address: string | undefined,
): CapAsset | undefined {
  if (!address) return assets.find((asset) => !asset.address);
  const wanted = address.toLowerCase();
  return assets.find((asset) => asset.address?.toLowerCase() === wanted);
}
