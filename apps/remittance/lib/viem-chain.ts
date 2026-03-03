import { type Chain } from "viem";
import type { NetworkData } from "@/lib/dynamic";

function parseChainId(networkId: string): number {
  const match = networkId.match(/evm-(\d+)/);
  if (match?.[1]) {
    return parseInt(match[1], 10);
  }
  return 1;
}

export function networkDataToViemChain(networkData: NetworkData): Chain {
  return {
    id: parseChainId(networkData.networkId),
    name: networkData.displayName,
    nativeCurrency: networkData.nativeCurrency,
    rpcUrls: {
      default: {
        http: networkData.rpcUrls?.http ?? [],
      },
    },
    blockExplorers: networkData.blockExplorerUrls?.[0]
      ? {
          default: {
            name: "Explorer",
            url: networkData.blockExplorerUrls[0],
          },
        }
      : undefined,
  };
}
