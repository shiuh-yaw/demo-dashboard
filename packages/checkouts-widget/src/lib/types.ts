export interface Token {
  address: string;
  chainId: number;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
}

export type ExecutionStatus =
  | "PENDING"
  | "ACTION_REQUIRED"
  | "RUNNING"
  | "DONE"
  | "FAILED";

export interface ExecutionUpdate {
  stepIndex: number;
  totalSteps: number;
  processType?: string;
  status: ExecutionStatus;
  txHash?: string;
  isBridging?: boolean;
  isCrossChain?: boolean;
  lifiExplorerLink?: string;
}

export interface ReviewQuote {
  route: {
    fromAmount: string;
    toAmount: string;
    fromChainId: number;
    toChainId: number;
    fromToken: { address: string; chainId: number; symbol: string; decimals: number };
    toToken: { address: string; chainId: number; symbol: string; decimals: number };
    steps: Array<{ type?: string }>;
  };
  fromToken: { address: string; chainId: number; symbol: string; decimals: number; name?: string; logoURI?: string };
  toToken: { address: string; chainId: number; symbol: string; decimals: number; name?: string; logoURI?: string };
  fromAmount: string;
  toAmount: string;
  toAmountUsd: string;
  totalFeeUsd: string;
  integratorFeeUsd?: string;
  integrator?: string;
}

export interface BrandConfig {
  fg?: string;
  bg?: string;
  muted?: string;
  cardGradientStart?: string;
  cardGradientEnd?: string;
  radius?: string;
  logoUrl?: string;
}
