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
import { DEPOSIT_ADDRESS_DESTINATION } from "@/lib/deposit-address";
import type { DestinationOverride } from "@/lib/destination-override";

function isOAuthRedirectUrl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("dynamicOauthCode");
}

export function CheckoutWidgetDemo({
  destinationOverride,
}: {
  destinationOverride?: DestinationOverride | null;
}) {
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
        <WidgetStage
          onBack={() => setPaying(false)}
          isTestnet={isTestnet}
          destinationOverride={destinationOverride}
        />
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
  destinationOverride,
}: {
  onBack: () => void;
  isTestnet: boolean;
  destinationOverride?: DestinationOverride | null;
}) {
  const [walletAddress, setWalletAddress] = useState("");
  const [walletChain, setWalletChain] = useState("EVM");

  // URL override wins over the testnet toggle and the wallet-derived
  // chain. Absent an override, behavior is unchanged.
  const fallbackToken = isTestnet
    ? USDC_ARB_SEPOLIA
    : walletChain === "SOL"
      ? USDC_SOLANA
      : USDC_BASE;
  const settlementToken = destinationOverride?.token ?? fallbackToken;
  const destinationChainName =
    destinationOverride?.chainFamily ?? (isTestnet ? "EVM" : walletChain);

  // Deposit-address destination: the URL to_address, else the env var.
  const depositAddressToken =
    destinationOverride?.token ?? (isTestnet ? USDC_ARB_SEPOLIA : USDC_BASE);
  const depositAddressFamily = destinationOverride?.chainFamily ?? "EVM";
  const depositAddressDest =
    destinationOverride?.address ?? DEPOSIT_ADDRESS_DESTINATION;

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
            destination(
              destinationChainName,
              destinationOverride?.address ?? walletAddress,
            ),
          ],
        },
      });
    },
    [walletAddress, destinationChainName, settlementToken, destinationOverride],
  );

  // Deposit-address path: no wallet is connected, so the destination is
  // the URL to_address or the configured merchant address. Row hidden
  // when neither is set.
  const createDepositAddressFlowCallback = useCallback(
    ({ amount, currency }: { amount: string; currency: string }) => {
      if (!depositAddressDest) {
        return Promise.reject(
          new Error(
            "No deposit-address destination (set to_address or NEXT_PUBLIC_FLOW_DEPOSIT_DESTINATION)",
          ),
        );
      }
      return createFlow({
        mode: "payment",
        amount,
        currency,
        settlementConfig: {
          settlements: [
            settlementFromToken(depositAddressToken, depositAddressFamily),
          ],
        },
        destinationConfig: {
          destinations: [destination(depositAddressFamily, depositAddressDest)],
        },
      });
    },
    [depositAddressDest, depositAddressToken, depositAddressFamily],
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
        destinationAddress={destinationOverride?.address ?? walletAddress}
        destinationChain={destinationChainName}
        currency="USD"
        amount="0.10"
        mode="payment"
        hideDestination
        minUsdValue={0.1}
        verifyOnConnect={false}
        onCancelled={onBack}
        exchangeDestinationAddress={
          destinationOverride?.address ?? (walletAddress || undefined)
        }
        exchangeSettlementChain={destinationChainName}
        exchangeSettlementChainId={settlementToken.chainId}
        createDepositAddressFlow={
          depositAddressDest ? createDepositAddressFlowCallback : undefined
        }
        depositAddressSettlement={{
          symbol: depositAddressToken.symbol,
          decimals: depositAddressToken.decimals,
          iconUrl: depositAddressToken.logoURI,
        }}
        sourceCategories
      />
    </div>
  );
}
