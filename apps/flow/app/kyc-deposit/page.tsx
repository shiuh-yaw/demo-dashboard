import { BaseChainIcon } from "@dynamic-labs/iconic";
import { DynamicWalletIcon } from "@/components/icons/dynamic-wallet";
import { DynamicBootstrap } from "@/components/DynamicBootstrap";
import {
  DisclaimerCite,
  FullDisclaimer,
  TransactionDisclaimer,
} from "@/components/disclaimer";
import {
  ChipArrow,
  RouteChip,
  ScenarioEyebrow,
  ScenarioSwitcher,
  TopBar,
} from "@/components/scenario-chrome";
import { DepositFeed } from "./components/deposit-feed";
import { KycDepositWidgetDemo } from "./components/widget-demo";

/**
 * /kyc-deposit — KYC-gated deposit scenario.
 *
 * Users connect their wallet, complete identity verification via SumSub,
 * then deposit USDC on Base Sepolia (a self-send to their own wallet). The
 * merchant off-ramps the deposited amount via the backend provider
 * (invisible to the end user).
 */
export default function KycDepositPage() {
  return (
    <div className="min-h-dvh bg-(--brand-page-bg)">
      <DynamicBootstrap />
      <main className="mx-auto max-w-6xl px-6 pt-8 pb-20">
        <TopBar />
        <KycDepositHero />
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-6 self-start">
            <KycDepositWidgetDemo />
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
    <section className="flex flex-col gap-5 max-w-3xl">
      <ScenarioEyebrow num="04" name="KYC Deposit" />

      <h1 className="!text-[clamp(2rem,4vw,3rem)] !leading-[1.05] text-balance text-(--brand-fg) font-semibold tracking-[-0.02em]">
        Verify once. Pay in USDC,{" "}
        <span className="text-(--brand-primary)">
          settle to the merchant&apos;s bank.
        </span>
      </h1>
      <p className="text-base lg:text-lg text-(--brand-fg-secondary) max-w-2xl">
        A crypto-to-fiat checkout: the customer pays in USDC, and the payment
        lands in the merchant&apos;s bank account as dollars. Connect a wallet,
        pass a one-time identity check (KYC), then deposit USDC — it&apos;s
        automatically converted and off-ramped to the merchant&apos;s bank, so
        the merchant never touches crypto
        <DisclaimerCite />.
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-1">
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
      </div>
    </section>
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


