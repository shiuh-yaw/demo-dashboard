"use client";

import { AgreementsCard } from "@/components/agreements-card";
import { BankAccountsCard } from "@/components/bank-accounts-card";
import { StablecoinWalletCard } from "@/components/screens/stablecoin-wallet-card";

export function PaymentMethodsScreen() {
  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="text-[13px] text-(--widget-muted) mb-4"
      >
        <span>Home</span>
        <span className="mx-1.5 opacity-40">/</span>
        <span className="text-(--widget-fg)">Agreements, Tax, and Banking</span>
      </nav>

      <h1 className="heading-page mb-1">Agreements, Tax, and Banking</h1>
      <p className="subheading mb-8 max-w-[640px]">
        Manage your paid and free apps agreements, and configure where your App
        Store payouts are sent.
      </p>

      <section className="mb-10">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="heading-section">Agreements</h2>
            <p className="subheading mt-0.5">
              Developer program and payout agreements on file.
            </p>
          </div>
        </div>
        <AgreementsCard />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="heading-section">Payment Methods</h2>
            <p className="subheading mt-0.5">
              Choose how you&apos;d like to receive your App Store revenue.
            </p>
          </div>
        </div>

        <div className="mb-5">
          <div className="mb-2 px-1">
            <h3 className="text-[13px] font-semibold text-(--widget-fg)">
              Stablecoin wallet
            </h3>
            <p className="text-[12px] text-(--widget-muted) mt-0.5">
              Receive App Store proceeds as USDC directly onchain.
            </p>
          </div>
          <StablecoinWalletCard />
        </div>

        <div>
          <div className="mb-2 px-1">
            <h3 className="text-[13px] font-semibold text-(--widget-fg)">
              Bank accounts
            </h3>
            <p className="text-[12px] text-(--widget-muted) mt-0.5">
              Linked accounts for fiat payouts and off-ramp transfers.
            </p>
          </div>
          <BankAccountsCard />
        </div>
      </section>
    </div>
  );
}
