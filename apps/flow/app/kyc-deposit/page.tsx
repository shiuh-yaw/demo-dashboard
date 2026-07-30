import { BaseChainIcon } from "@dynamic-labs/iconic";
import { DynamicWalletIcon } from "@/components/icons/dynamic-wallet";
import { DynamicBootstrap } from "@/components/DynamicBootstrap";
import {
  DisclaimerCite,
  FullDisclaimer,
  TransactionDisclaimer,
} from "@/components/disclaimer";
import { ChipArrow, RouteChip, ScenarioHero } from "@dynamic-demos/ui";
import { ScenarioSwitcher } from "@/components/scenario-chrome";
import { DepositFeed } from "./components/deposit-feed";
import { KycDepositWidgetDemo } from "./components/widget-demo";
import { resolveAddressOverride } from "@/lib/destination-override";

/**
 * /kyc-deposit — KYC-gated deposit scenario.
 *
 * Users connect their wallet, complete identity verification via SumSub,
 * then deposit USDC on Base Sepolia (a self-send to their own wallet). The
 * merchant off-ramps the deposited amount via the backend provider
 * (invisible to the end user).
 */
export default async function KycDepositPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // KYC settlement is locked to USDC on Base Sepolia (EVM); network is
  // not overridable here, only the destination address.
  const destinationOverride = resolveAddressOverride(params, "EVM");

  return (
    <div>
      <DynamicBootstrap />
      <main className="mx-auto max-w-6xl px-6 pt-8 pb-20">
        <KycDepositHero />
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Widget column pins near the top on scroll (flow header is
              non-sticky, so no h-20 offset is needed). */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 self-start">
            <KycDepositWidgetDemo destinationOverride={destinationOverride} />
            <TransactionDisclaimer />
          </div>
          <div className="lg:col-span-7">
            <DepositFeed />
          </div>
        </div>
        <ScenarioSwitcher active="kyc-deposit" exclude={["deposit"]} />
        <FullDisclaimer />
      </main>
    </div>
  );
}

// =============================================================================
// Hero
// =============================================================================

function KycDepositHero() {
  return (
    <ScenarioHero
      eyebrow={{ num: "04", name: "KYC Deposit" }}
      title="Verify once. Pay in USDC,"
      titleAccent="settle to the merchant's bank."
      pitch={
        <>
          A crypto-to-fiat checkout: the customer pays in USDC, and the
          payment lands in the merchant&apos;s bank account as dollars.
          Connect a wallet, pass a one-time identity check (KYC), then deposit
          USDC - it&apos;s automatically converted and off-ramped to the
          merchant&apos;s bank, so the merchant never touches crypto
          <DisclaimerCite />.
        </>
      }
      chips={
        <>
          <RouteChip
            icon={<DynamicWalletIcon size={20} />}
            label="Customer wallet"
            detail="Pays in USDC"
          />
          <ChipArrow />
          <RouteChip
            icon={<BaseChainIcon className="h-5 w-5" />}
            label="Deposit"
            detail="USDC on Base Sepolia"
          />
          <ChipArrow />
          <RouteChip
            icon={<BankIcon />}
            label="Merchant bank"
            detail="Settles in USD"
          />
        </>
      }
    />
  );
}

function BankIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8l7-4 7 4M4 8v6m4-6v6m4-6v6m4-6v6M3 17h14" />
    </svg>
  );
}


