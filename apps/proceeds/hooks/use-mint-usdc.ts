"use client";

import { useCallback } from "react";
import { encodeFunctionData } from "viem";
import {
  DYNAMIC_USDC_ABI,
  getDynamicUsdcAddress,
  DEMO_PAYOUT_CHAIN_ID,
} from "@/lib/contracts";
import {
  useSmartAccountTx,
  type UseSmartAccountTxOptions,
} from "./use-smart-account-tx";

/**
 * Max dollars per mint transaction.
 *
 * The Dynamic USDC demo contract enforces a per-call cap (observed via the
 * `0xd04c03b4` revert on larger amounts). Empirically, single-call mints in
 * the low hundreds of dollars succeed. Monthly payouts in this demo are
 * scaled to stay under this cap in a single call.
 */
const MAX_DOLLARS_PER_MINT = 500;

interface MintOptions {
  /** Whole-dollar amount to mint. Fractional dollars are rounded down. */
  amountDollars: number;
  /** Chain id (defaults to Base Sepolia). */
  chainId?: number;
}

function dollarsToWhole(dollars: number): bigint {
  return BigInt(Math.floor(dollars));
}

/**
 * Mint Dynamic USDC to the developer's smart wallet. Used to simulate Apple
 * pushing a month's proceeds on-chain as part of the payout demo.
 *
 * Uses the shared `useSmartAccountTx` pipeline so the passkey registration,
 * 7702 activation, single-use MFA, and kernel-client build are identical to
 * the Transfer flow.
 */
export function useMintUsdc(options?: UseSmartAccountTxOptions) {
  const tx = useSmartAccountTx(options);

  const mintUsdc = useCallback(
    async (mintOptions: MintOptions) => {
      const { amountDollars, chainId = DEMO_PAYOUT_CHAIN_ID } = mintOptions;

      if (!Number.isFinite(amountDollars) || amountDollars <= 0) {
        throw new Error("Payout amount must be greater than zero.");
      }

      const amountWhole = Math.floor(amountDollars);
      if (amountWhole === 0) {
        throw new Error("Amount too small to mint (must be ≥ $1).");
      }
      if (amountWhole > MAX_DOLLARS_PER_MINT) {
        throw new Error(
          `Single-call demo mints are capped at $${MAX_DOLLARS_PER_MINT}. Scale the mock data down or split into multiple monthly payouts.`,
        );
      }

      const usdcAddress = getDynamicUsdcAddress(chainId);
      if (!usdcAddress) {
        throw new Error(
          `Demo USDC contract not deployed on chain ${chainId}.`,
        );
      }

      const data = encodeFunctionData({
        abi: DYNAMIC_USDC_ABI,
        functionName: "mint",
        args: [dollarsToWhole(amountWhole)],
      });

      return tx.execute({
        to: usdcAddress,
        data,
        chainId,
      });
    },
    [tx],
  );

  return {
    isPending: tx.isPending,
    phase: tx.phase,
    txHash: tx.txHash,
    error: tx.error,
    mintUsdc,
    reset: tx.reset,
  };
}
