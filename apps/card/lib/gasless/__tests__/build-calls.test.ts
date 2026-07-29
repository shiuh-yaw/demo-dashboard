import { describe, it, expect } from "vitest";
import { encodeFunctionData, erc20Abi, parseUnits } from "viem";
import { buildTransferCalls, buildMintCalls } from "../build-calls";
import { RUSDC_ADDRESS, RUSDC_DECIMALS, RUSDC_MINT_ABI, FAUCET_DOLLARS } from "@/lib/constants";

describe("gasless call builders", () => {
  it("builds an ERC-20 transfer call to the deposit address", () => {
    const to = "0x1111111111111111111111111111111111111111";
    const calls = buildTransferCalls(to, "25");
    expect(calls).toEqual([
      {
        target: RUSDC_ADDRESS,
        value: 0n,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [to, parseUnits("25", RUSDC_DECIMALS)],
        }),
      },
    ]);
  });

  it("builds a faucet mint call for FAUCET_DOLLARS in WHOLE tokens", () => {
    const calls = buildMintCalls();
    expect(calls).toEqual([
      {
        target: RUSDC_ADDRESS,
        value: 0n,
        data: encodeFunctionData({
          abi: RUSDC_MINT_ABI,
          functionName: "mint",
          // Whole tokens, not 6-decimal base units - the faucet mint reverts
          // above a per-mint cap that parseUnits(...,6) would blow past.
          args: [BigInt(FAUCET_DOLLARS)],
        }),
      },
    ]);
  });
});
