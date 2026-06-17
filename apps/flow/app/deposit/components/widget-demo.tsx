"use client";

/**
 * Deposit demo slot. Renders a "Top up your balance" platform card
 * with a "Deposit funds" CTA; clicking the CTA mounts `<CheckoutWidget />`
 * configured for the deposit lifecycle. Flow is created server-side when
 * the user reaches review (amount known).
 *
 * The destination is the wallet that originates the transaction — i.e.
 * the connected wallet's own address.
 */

import { useCallback, useEffect, useState } from "react";
import { BackButton } from "@/components/back-button";
import { ExchangeCheckoutWidget } from "@/components/exchange-checkout-widget";
import { ScenarioCard } from "@/components/scenario-card";
import { useTestnetMode } from "@/components/testnet-toggle";
import { USDC_BASE, USDC_ARB_SEPOLIA } from "@/lib/tokens";
import { isTestnetSupportedToken } from "@/lib/testnet";
import { createFlow } from "@/lib/checkouts-api";
import type { TokenAsset } from "@dynamic-demos/checkouts-widget";
import { BalanceIllustration } from "./balance-illustration";
import { hasPendingExchangeRedirect } from "@/lib/exchanges";
import { logout } from "@/lib/dynamic/flow-sdk";

function isOAuthRedirectUrl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("dynamicOauthCode");
}

export function DepositWidgetDemo() {
  const [depositing, setDepositing] = useState(false);
  const { isTestnet } = useTestnetMode();

  useEffect(() => {
    if (hasPendingExchangeRedirect() || isOAuthRedirectUrl()) {
      setDepositing(true);
    }
  }, []);

  return (
    <div className="w-full max-w-[440px] mx-auto lg:mx-0">
      {depositing ? (
        <WidgetStage onBack={() => setDepositing(false)} isTestnet={isTestnet} />
      ) : (
        <ScenarioCard
          eyebrow="Platform balance"
          title="Top up your account"
          body="Fund your balance from any wallet on any chain. Flow swaps it to USDC and credits your platform wallet."
          ctaLabel="Deposit funds"
          onCta={() => setDepositing(true)}
          illustration={<BalanceIllustration />}
        />
      )}
    </div>
  );
}

function WidgetStage({
  onBack,
  isTestnet,
}: {
  onBack: () => void;
  isTestnet: boolean;
}) {
  const [walletAddress, setWalletAddress] = useState("");
  const settlementChain = isTestnet ? "arb-sepolia" : "base";

  const createFlowCallback = useCallback(
    ({ amount, currency }: { amount: string; currency: string }) => {
      if (!walletAddress) {
        return Promise.reject(
          new Error("Connect a wallet before starting deposit"),
        );
      }
      return createFlow({
        mode: "deposit",
        amount,
        currency,
        destinationAddress: walletAddress,
        destinationChain: "EVM",
        asset: "USDC",
        chain: settlementChain,
      });
    },
    [walletAddress, settlementChain],
  );

  const tokenFilter = useCallback(
    (token: TokenAsset) =>
      isTestnet
        ? isTestnetSupportedToken(token.chainId, token.symbol)
        : true,
    [isTestnet],
  );

  const effectiveDestinationToken = isTestnet ? USDC_ARB_SEPOLIA : USDC_BASE;
  const effectiveSettlementChainId = isTestnet ? 421614 : 8453;

  const handleDisconnect = useCallback(() => {
    setWalletAddress("");
    logout();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} label="Back to platform" />
      </div>
      <ExchangeCheckoutWidget
        hidePoweredBy
        hideLegalLinks
        skipAutoConnect
        onDisconnect={handleDisconnect}
        createFlow={createFlowCallback}
        destinationToken={effectiveDestinationToken}
        tokenFilter={tokenFilter}
        skipMinUsdValueFilter={isTestnet}
        onWalletConnected={setWalletAddress}
        destinationAddress={walletAddress}
        destinationChain="EVM"
        currency="USD"
        presetAmounts={[25, 50, 100, 250]}
        minAmount={0.1}
        amountFirst
        mode="deposit"
        verifyOnConnect={false}
        onCancelled={onBack}
        exchangeDestinationAddress={walletAddress || undefined}
        exchangeSettlementChain="EVM"
        exchangeSettlementChainId={effectiveSettlementChainId}
      />
    </div>
  );
}
