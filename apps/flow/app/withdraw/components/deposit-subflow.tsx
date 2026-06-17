"use client";

/**
 * Deposit sub-flow inside the withdraw demo's platform shell —
 * bridges funds INTO the embedded EVM wallet on Base.
 *
 * Flow is created server-side when the user reaches review (amount known),
 * via `createFlow` passed to CheckoutWidget — not on mount.
 */

import { useMemo } from "react";
import { CheckoutWidget } from "@dynamic-demos/checkouts-widget";
import { bindCreateFlow } from "@/lib/bind-create-flow";
import type { WalletAccount } from "@/lib/dynamic/flow-sdk";
import { USDC_ON_BASE } from "../settlement-options";

export function DepositSubFlow({
  sourceWalletAccount,
  destinationAddress,
  onDone,
}: {
  sourceWalletAccount: WalletAccount | null;
  destinationAddress: string;
  onDone: () => void;
}) {
  const createFlow = useMemo(
    () =>
      bindCreateFlow({
        mode: "deposit",
        destinationAddress,
        destinationChain: "EVM",
        asset: "USDC",
        chain: "base",
      }),
    [destinationAddress],
  );

  return (
    <CheckoutWidget
      walletAccount={sourceWalletAccount ?? undefined}
      createFlow={createFlow}
      destinationToken={USDC_ON_BASE}
      destinationAddress={destinationAddress}
      destinationChain="EVM"
      currency="USD"
      mode="deposit"
      amountFirst
      minAmount={1}
      presetAmounts={[25, 50, 100, 250]}
      hidePoweredBy
      hideLegalLinks
      onCancelled={onDone}
    />
  );
}
