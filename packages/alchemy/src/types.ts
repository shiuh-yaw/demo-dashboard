/** Alchemy network subdomain prefixes keyed by EVM chain ID */
export const ALCHEMY_NETWORKS: Record<number, string> = {
  1: "eth-mainnet",
  5: "eth-goerli",
  11155111: "eth-sepolia",
  137: "polygon-mainnet",
  80001: "polygon-mumbai",
  80002: "polygon-amoy",
  42161: "arb-mainnet",
  421614: "arb-sepolia",
  10: "opt-mainnet",
  11155420: "opt-sepolia",
  8453: "base-mainnet",
  84532: "base-sepolia",
};

export type AssetTransferCategory =
  | "external"
  | "internal"
  | "erc20"
  | "erc721"
  | "erc1155";

export interface GetAssetTransfersParams {
  fromAddress?: string;
  toAddress?: string;
  fromBlock?: string;
  toBlock?: string;
  category: AssetTransferCategory[];
  contractAddresses?: string[];
  order?: "asc" | "desc";
  maxCount?: string;
  pageKey?: string;
  withMetadata?: boolean;
  excludeZeroValue?: boolean;
}

export interface RawContract {
  value: string | null;
  address: string | null;
  decimal: string | null;
}

export interface TransferMetadata {
  blockTimestamp: string;
}

export interface AssetTransfer {
  blockNum: string;
  hash: string;
  from: string;
  to: string;
  value: number | null;
  asset: string | null;
  category: AssetTransferCategory;
  rawContract: RawContract;
  metadata?: TransferMetadata;
}

export interface GetAssetTransfersResponse {
  transfers: AssetTransfer[];
  pageKey?: string;
}

export interface AlchemyOptions {
  apiKey: string;
  network: string;
}
