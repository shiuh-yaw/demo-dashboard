"use client";

/**
 * Pure builders for native-gasless call batches. `sendSponsoredTransaction`
 * (@dynamic-labs-sdk/evm) takes a `calls: { target, data, value }[]` batch and
 * relays it via EIP-7702 from the user's embedded wallet.
 */

import { encodeFunctionData, erc20Abi, parseUnits, type Hex } from "viem";
import type { SponsoredTransactionCall } from "@dynamic-labs-sdk/evm";
import {
  FAUCET_DOLLARS,
  RUSDC_ADDRESS,
  RUSDC_DECIMALS,
  RUSDC_MINT_ABI,
} from "@/lib/constants";

/** RUSDC transfer of `amount` (human dollars) to the Rain deposit address. */
export function buildTransferCalls(
  depositAddress: string,
  amount: string,
): SponsoredTransactionCall[] {
  return [
    {
      target: RUSDC_ADDRESS,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [depositAddress as Hex, parseUnits(amount, RUSDC_DECIMALS)],
      }),
    },
  ];
}

/**
 * Faucet mint of FAUCET_DOLLARS RUSDC to the caller's own wallet.
 *
 * The faucet `mint(amount)` takes WHOLE tokens, not 6-decimal base units
 * (same as earn's Dynamic testnet USDC), and reverts above a per-mint cap -
 * `parseUnits("100", 6)` = 100_000_000 exceeds it. Pass the whole-dollar
 * count directly; the contract scales by decimals internally.
 */
export function buildMintCalls(): SponsoredTransactionCall[] {
  return [
    {
      target: RUSDC_ADDRESS,
      value: 0n,
      data: encodeFunctionData({
        abi: RUSDC_MINT_ABI,
        functionName: "mint",
        args: [BigInt(FAUCET_DOLLARS)],
      }),
    },
  ];
}
