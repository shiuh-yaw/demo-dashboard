"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Wallet,
  CreditCard,
  Link2,
  Plus,
  Copy,
  Check,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { PayoutMethodCard } from "@/components/ui/payout-method-card";
import { WalletOptionCard } from "@/components/ui/wallet-option-card";
import { ConnectWalletModal } from "@/components/screens/connect-wallet-modal";
import { CreateWalletModal } from "@/components/screens/create-wallet-modal";
import {
  ConnectExternalWalletModal,
  EXTERNAL_WALLET_PROVIDER_PREFIX,
} from "@/components/screens/connect-external-wallet-modal";
import { usePayoutContext } from "@/contexts/payout-context";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { useUSDCBalance } from "@/hooks/use-usdc-balance";
import { useYieldPositions } from "@/hooks/use-yield-positions";
import { useCefi } from "@/hooks/use-cefi";
import { useExternalWalletLabel } from "@/hooks/use-external-wallet-label";
import { MOCK_BANK_ACCOUNT, MOCK_CARD } from "@/lib/mock-data";
import { truncateAddress } from "@/lib/format";
import { getExchangeDisplay } from "@/lib/exchanges-registry";

function providerLabel(
  provider: string,
  externalWalletLabel: string | null,
): string {
  if (provider === "embedded") return "Embedded wallet";
  if (provider.startsWith(EXTERNAL_WALLET_PROVIDER_PREFIX)) {
    // `external:{providerKey}` — the display name comes from
    // Dynamic's live provider list (resolved by the hook below).
    // When we haven't resolved it yet, fall back to a generic label
    // rather than leaking the raw `metamaskevm`-style key.
    return externalWalletLabel ?? "External wallet";
  }
  // Everything else is a CeFi exchange key — run it through the same
  // display registry the exchange-wallet modal uses so the label
  // stays in sync.
  return getExchangeDisplay(provider).name;
}

/**
 * Description for the "Connect your CeFi wallet" sub-option card.
 * Driven by the live set of configured exchanges so the copy doesn't
 * lie about which providers are supported.
 */
function describeCefiOption(
  isConnected: boolean,
  activeExchange: string | null,
  availableCount: number,
): string {
  if (isConnected && activeExchange) {
    return `${getExchangeDisplay(activeExchange).name} linked — continue setup`;
  }
  if (availableCount === 0) return "Enable an exchange in Dynamic to link";
  if (availableCount === 1) return "Link your exchange account";
  return "Link a supported exchange";
}

/**
 * Payment methods screen — Phase 2.
 *
 * Phase 2 additions:
 * - "Connect wallet" and "Create wallet" buttons are enabled
 * - ConnectWalletModal: BYO CeFi flow (provider select → verify → confirm)
 * - CreateWalletModal: embedded wallet flow (confirm → creating → done)
 * - After setup: sub-options replaced with wallet address display on card
 */
export function PaymentMethodsScreen() {
  const {
    defaultMethod,
    setDefaultMethod,
    walletAddress,
    walletProvider,
    clearWallet,
  } = usePayoutContext();
  const { networkLabel } = useActiveNetwork();

  // Only query balance for embedded wallets — Dynamic owns that wallet
  // and we can read it straight from Sepolia. CeFi (BYO) wallets sit on
  // whatever chain the external provider uses, so we skip the read.
  const usdcBalance = useUSDCBalance(
    walletProvider === "embedded" ? walletAddress : null,
  );
  // Subtract any (demo) yield deposits from the on-chain balance so
  // this card stays consistent with `/wallet`, where the hero shows
  // liquid funds separately from what's earning yield.
  const { totalDeposited } = useYieldPositions();
  const onchainBalance = usdcBalance.raw?.balance ?? 0;
  const availableBalance = Math.max(0, onchainBalance - totalDeposited);
  const availableFormatted =
    availableBalance.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " USDC";

  const [showConnectWallet, setShowConnectWallet] = useState(false);
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [showConnectExternal, setShowConnectExternal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Resolve the friendly display name for any stored `external:{key}`
  // wallet provider so the connected-wallet card can read "via MetaMask"
  // rather than the SDK's raw provider key.
  const externalWalletLabel = useExternalWalletLabel(walletProvider);

  const cefi = useCefi();
  const { didJustConnect, clearJustConnected, reopenModalSignal } = cefi;

  // Reopen the CeFi connect modal after the OAuth redirect returns.
  // - `didJustConnect` fires when the link actually succeeded and we
  //   want to land the user on the `connected` step.
  // - `reopenModalSignal` fires when there's no real success (e.g. a
  //   conflict — same exchange already linked to a different user)
  //   but we still need the modal visible so the user sees the error.
  useEffect(() => {
    if (didJustConnect) {
      setShowConnectWallet(true);
      clearJustConnected();
    }
  }, [didJustConnect, clearJustConnected]);

  useEffect(() => {
    if (reopenModalSignal > 0) {
      setShowConnectWallet(true);
    }
  }, [reopenModalSignal]);

  function handleCopyAddress() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Embedded wallets live on Dynamic's active network; CeFi (BYO) and
  // external wallets are off-Dynamic so we don't know the exact chain
  // — fall back to "Ethereum" (the deposit network Kraken/Coinbase use
  // for USDC payouts in this demo) rather than surfacing the technical
  // "EVM" term to hosts.
  const embeddedNetworkLabel = networkLabel ?? "Ethereum";
  const cefiNetworkLabel = "Ethereum";

  const walletDescription = walletAddress
    ? walletProvider === "embedded"
      ? `USDC · Embedded wallet — ${embeddedNetworkLabel}`
      : `USDC · via ${providerLabel(walletProvider ?? "", externalWalletLabel)} — ${cefiNetworkLabel}`
    : "Receive USDC directly to your stablecoin wallet";

  const walletBadge = walletAddress
    ? defaultMethod === "wallet"
      ? { label: "Default", variant: "default" as const }
      : { label: "Configured", variant: "configured" as const }
    : defaultMethod === "wallet"
      ? { label: "Default", variant: "default" as const }
      : undefined;

  return (
    <>
      <div>
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-(--brand-fg)">
            Payout methods
          </h1>
          <p className="text-sm text-(--brand-muted) mt-1">
            Choose how you'd like to receive your Airbnb earnings
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {/* Card 1 — Stablecoin wallet (primary demo surface) */}
          <PayoutMethodCard
            icon={<Wallet className="w-5 h-5" />}
            title="Stablecoin wallet"
            description={walletDescription}
            badge={walletBadge}
            isDefault={defaultMethod === "wallet"}
            onSetDefault={
              walletAddress ? () => setDefaultMethod("wallet") : undefined
            }
          >
            {walletAddress ? (
              /* Phase 2: wallet connected — show address + balance */
              <div className="p-3 rounded-(--brand-radius) bg-(--brand-row-bg) border border-(--brand-border)">
                <p className="text-xs font-medium text-(--brand-muted) mb-1">
                  Connected wallet
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-mono text-(--brand-fg)">
                    {truncateAddress(walletAddress)}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCopyAddress}
                      className="p-1 text-(--brand-muted) hover:text-(--brand-fg) transition-colors"
                      aria-label="Copy wallet address"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-(--brand-success)" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={clearWallet}
                      className="p-1 text-(--brand-muted) hover:text-(--brand-error) transition-colors"
                      aria-label="Remove wallet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Balance row — only rendered for embedded wallets where we
                    know the chain from Dynamic and can query the indexer. */}
                {walletProvider === "embedded" && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-(--brand-border)">
                    <span className="text-xs text-(--brand-muted)">
                      Balance
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-(--brand-fg) tabular-nums">
                        {usdcBalance.isLoading
                          ? "Loading…"
                          : availableFormatted}
                      </span>
                      <button
                        onClick={() => usdcBalance.refetch()}
                        disabled={usdcBalance.isFetching}
                        className="p-1 -mr-1 text-(--brand-muted) hover:text-(--brand-fg) transition-colors disabled:opacity-50"
                        aria-label="Refresh balance"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            usdcBalance.isFetching ? "animate-spin" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-(--brand-muted) mt-1.5">
                  {walletProvider === "embedded"
                    ? `Embedded wallet · USDC · ${embeddedNetworkLabel}`
                    : `via ${providerLabel(walletProvider ?? "", externalWalletLabel)} · USDC · ${cefiNetworkLabel}`}
                </p>
              </div>
            ) : (
              /* Phase 2: no wallet — show enabled sub-option cards */
              <>
                <WalletOptionCard
                  icon={<Link2 className="w-4 h-4" />}
                  title="Connect your Exchange Wallet"
                  description={describeCefiOption(
                    cefi.isConnected,
                    cefi.activeExchange,
                    cefi.availableExchanges.length,
                  )}
                  selected={showConnectWallet}
                  onClick={() => setShowConnectWallet(true)}
                />
                <WalletOptionCard
                  icon={<Plus className="w-4 h-4" />}
                  title="Create embedded wallet"
                  description="Provision a secure wallet in seconds"
                  selected={showCreateWallet}
                  onClick={() => setShowCreateWallet(true)}
                />
                <WalletOptionCard
                  icon={<Wallet className="w-4 h-4" />}
                  title="Connect external wallet"
                  description="Link MetaMask, Coinbase Wallet, and more"
                  selected={showConnectExternal}
                  onClick={() => setShowConnectExternal(true)}
                />
              </>
            )}
          </PayoutMethodCard>

          {/* Card 2 — Bank account */}
          <PayoutMethodCard
            icon={<Building2 className="w-5 h-5" />}
            title="Bank account"
            description={`${MOCK_BANK_ACCOUNT.bank} ${MOCK_BANK_ACCOUNT.accountMasked} — ${MOCK_BANK_ACCOUNT.type}`}
            badge={
              defaultMethod === "bank"
                ? { label: "Default", variant: "default" }
                : undefined
            }
            detailLeft={`Routing ${MOCK_BANK_ACCOUNT.routingMasked}`}
            detailRight="Typically 1–2 business days"
            isDefault={defaultMethod === "bank"}
            onSetDefault={() => setDefaultMethod("bank")}
          />

          {/* Card 3 — Debit card */}
          <PayoutMethodCard
            icon={<CreditCard className="w-5 h-5" />}
            title="Debit card"
            description={`${MOCK_CARD.network} ${MOCK_CARD.cardMasked} — expires ${MOCK_CARD.expiry}`}
            badge={
              defaultMethod === "card"
                ? { label: "Default", variant: "default" }
                : { label: "Configured", variant: "configured" }
            }
            detailLeft="Instant payout"
            detailRight="Fee may apply"
            isDefault={defaultMethod === "card"}
            onSetDefault={() => setDefaultMethod("card")}
          />
        </div>
      </div>

      {/* Phase 2 modals */}
      <ConnectWalletModal
        isOpen={showConnectWallet}
        onClose={() => setShowConnectWallet(false)}
        availableExchanges={cefi.availableExchanges}
        activeExchange={cefi.activeExchange}
        isConnected={cefi.isConnected}
        socialAccount={cefi.socialAccount}
        krakenAccounts={cefi.krakenAccounts}
        isLoadingAccounts={cefi.isLoadingAccounts}
        refetchAccounts={cefi.refetchAccounts}
        connect={cefi.connect}
        fetchDepositAddress={cefi.fetchDepositAddress}
        isFetchingDepositAddress={cefi.isFetchingDepositAddress}
        depositAddressError={cefi.depositAddressError}
        clearDepositAddressError={cefi.clearDepositAddressError}
        linkConflict={cefi.linkConflict}
        clearLinkConflict={cefi.clearLinkConflict}
      />
      <CreateWalletModal
        isOpen={showCreateWallet}
        onClose={() => setShowCreateWallet(false)}
      />
      <ConnectExternalWalletModal
        isOpen={showConnectExternal}
        onClose={() => setShowConnectExternal(false)}
      />
    </>
  );
}
