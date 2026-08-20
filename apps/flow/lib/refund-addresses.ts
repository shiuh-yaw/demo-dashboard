/**
 * Refund addresses for `deposit_address` sources, one per source chain
 * family. The API requires a refundAddress per deposit-address source
 * and the bridge refunds on the SOURCE chain, so the address is picked
 * from the selected source rather than from the settlement side.
 *
 * These are demo-owned public addresses, hardcoded so the deposit
 * address flow works in every deployment without extra config. The
 * asset select's Advanced disclosure overrides them per flow.
 */

import type { Chain } from "@dynamic-labs-sdk/client";

export interface RefundAddressConfig {
  chain: Chain;
  address: string;
}

export const DEPOSIT_ADDRESS_REFUND_ADDRESSES: readonly RefundAddressConfig[] =
  [
    { chain: "BTC", address: "bc1qcy5w83f3fggtu8fxjytg8jhyne3p8d0xdrz7s0" },
    { chain: "EVM", address: "0x5C260969b90152a46D52BC476C94524C8E796b3d" },
    { chain: "SOL", address: "CivTE6ZNRPyvX53gR4gGwVPq1RfCh9o9tDrmWWN7t1zb" },
  ];

export function refundAddressForChain(
  chain: Chain,
  configs: readonly RefundAddressConfig[],
): string | undefined {
  return configs.find((config) => config.chain === chain)?.address;
}
