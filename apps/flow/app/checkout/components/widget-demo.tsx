"use client";

/**
 * Checkout demo slot. Renders a mock product card with a "Pay with
 * crypto" CTA; clicking the CTA boots the Dynamic client and mounts
 * `<CheckoutWidget />` with deferred Flow creation (amount known at review).
 *
 * The destination address is the connected wallet's own address — funds
 * settle back to the wallet that originated the transaction.
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
import { TicketIllustration } from "./ticket-illustration";
import { hasPendingExchangeRedirect } from "@/lib/exchanges";
import { logout } from "@/lib/dynamic/flow-sdk";

function isOAuthRedirectUrl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("dynamicOauthCode");
}

export function CheckoutWidgetDemo() {
  const [paying, setPaying] = useState(false);
  const { isTestnet } = useTestnetMode();

  useEffect(() => {
    if (hasPendingExchangeRedirect() || isOAuthRedirectUrl()) {
      setPaying(true);
    }
  }, []);

  return (
    <div className="w-full max-w-[440px] mx-auto lg:mx-0">
      {paying ? (
        <WidgetStage onBack={() => setPaying(false)} isTestnet={isTestnet} />
      ) : (
        <ScenarioCard
          eyebrow="Demo purchase"
          title="Backstage pass · Sample event"
          body="Tap below to launch the embedded Flow widget and watch the lifecycle in the code panel on the right."
          ctaLabel="Pay with crypto"
          onCta={() => setPaying(true)}
          illustration={<TicketIllustration />}
          trailingHeader={
            <span className="text-base font-semibold text-(--brand-fg) font-mono">
              $0.10
            </span>
          }
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
          new Error("Connect a wallet before starting checkout"),
        );
      }
      return createFlow({
        mode: "payment",
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
        <BackButton onClick={onBack} label="Back to product" />
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
        amount="0.10"
        mode="payment"
        hideDestination
        minUsdValue={0.1}
        verifyOnConnect={false}
        onCancelled={onBack}
        exchangeDestinationAddress={walletAddress || undefined}
        exchangeSettlementChain={destinationChainName}
        exchangeSettlementChainId={settlementToken.chainId}
      />
    </div>
  );
}
