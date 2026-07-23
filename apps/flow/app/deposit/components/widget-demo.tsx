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
import { USDC_BASE, USDC_ARB_SEPOLIA, USDC_SOLANA, chainFamilyForId } from "@/lib/tokens";
import { isTestnetSupportedToken } from "@/lib/testnet";
import { createFlow, settlementFromToken, destination } from "@/lib/checkouts-api";
import type { TokenAsset } from "@dynamic-demos/checkouts-widget";
import { BalanceIllustration } from "./balance-illustration";
import { hasPendingExchangeRedirect } from "@/lib/exchanges";
import { logout } from "@/lib/dynamic/flow-sdk";
import { DEPOSIT_ADDRESS_DESTINATION } from "@/lib/deposit-address";

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
  const [walletChain, setWalletChain] = useState("EVM");

  // Resolve settlement token from wallet chain.
  // Testnet: always Arb Sepolia. Mainnet: match the wallet's chain.
  const settlementToken = isTestnet
    ? USDC_ARB_SEPOLIA
    : walletChain === "SOL"
      ? USDC_SOLANA
      : USDC_BASE;
  // Testnet forces EVM (arb-sepolia); mainnet uses the wallet's chain.
  const destinationChainName = isTestnet ? "EVM" : walletChain;

  const handleWalletConnected = useCallback((address: string, chain: string) => {
    setWalletAddress(address);
    setWalletChain(chain);
  }, []);

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
        settlementConfig: {
          settlements: [
            settlementFromToken(settlementToken, chainFamilyForId(settlementToken.chainId)),
          ],
        },
        destinationConfig: {
          destinations: [
            destination(destinationChainName, walletAddress),
          ],
        },
      });
    },
    [walletAddress, destinationChainName, settlementToken],
  );

  // Deposit-address path: no wallet is connected, so the destination is
  // the configured platform address, not the connected wallet. Settles
  // USDC on Base (Arb Sepolia in testnet mode). Row hidden when the
  // env var is unset.
  const createDepositAddressFlowCallback = useCallback(
    ({ amount, currency }: { amount: string; currency: string }) => {
      if (!DEPOSIT_ADDRESS_DESTINATION) {
        return Promise.reject(
          new Error("NEXT_PUBLIC_FLOW_DEPOSIT_DESTINATION is not configured"),
        );
      }
      const token = isTestnet ? USDC_ARB_SEPOLIA : USDC_BASE;
      return createFlow({
        mode: "deposit",
        amount,
        currency,
        settlementConfig: {
          settlements: [settlementFromToken(token, "EVM")],
        },
        destinationConfig: {
          destinations: [destination("EVM", DEPOSIT_ADDRESS_DESTINATION)],
        },
      });
    },
    [isTestnet],
  );

  const tokenFilter = useCallback(
    (token: TokenAsset) =>
      isTestnet
        ? isTestnetSupportedToken(token.chainId, token.symbol)
        : true,
    [isTestnet],
  );

  const handleDisconnect = useCallback(() => {
    setWalletAddress("");
    setWalletChain("EVM");
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
        destinationToken={settlementToken}
        tokenFilter={tokenFilter}
        skipMinUsdValueFilter={isTestnet}
        onWalletConnected={handleWalletConnected}
        destinationAddress={walletAddress}
        destinationChain={destinationChainName}
        currency="USD"
        presetAmounts={[25, 50, 100, 250]}
        minAmount={0.1}
        amountFirst
        mode="deposit"
        verifyOnConnect={false}
        onCancelled={onBack}
        exchangeDestinationAddress={walletAddress || undefined}
        exchangeSettlementChain={destinationChainName}
        exchangeSettlementChainId={settlementToken.chainId}
        createDepositAddressFlow={
          DEPOSIT_ADDRESS_DESTINATION
            ? createDepositAddressFlowCallback
            : undefined
        }
        depositAddressSettlement={{
          symbol: "USDC",
          decimals: 6,
          iconUrl: (isTestnet ? USDC_ARB_SEPOLIA : USDC_BASE).logoURI,
        }}
        sourceCategories
      />
    </div>
  );
}
