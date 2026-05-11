import { headers } from "next/headers";
import { notFound } from "next/navigation";
import EmbeddedWalletWidget from "@/components/embedded-wallet-widget";
import WidgetLayout from "@/components/widget-layout";
import WidgetNav from "@/components/widget-nav";
import { getCheckoutConfig } from "@/lib/api/checkouts";

/**
 * Embedded Wallet Page
 *
 * Shows the user's embedded wallet for the active checkout config.
 * Only accessible when `depositDestination === "embedded"`.
 *
 * The brand config id comes from the `x-checkouts-config-id` header
 * (resolved by middleware from `?theme=` or sticky cookie). Reaching
 * this page without a config id is a 404 — there's no unbranded
 * embedded wallet flow.
 */
export default async function WalletPage() {
  const headersList = await headers();
  const configId = headersList.get("x-checkouts-config-id");
  if (!configId) notFound();

  const stored = await getCheckoutConfig(configId);
  if (!stored) notFound();

  const { config } = stored;
  if (config.depositDestination !== "embedded") {
    notFound();
  }

  return (
    <WidgetLayout config={config} footer={<WidgetNav />}>
      <div className="w-full max-w-[385px]">
        <EmbeddedWalletWidget
          settlementChainType={config.settlement?.chain}
          settlementChainId={config.settlement?.chainId}
          settlementTokenAddress={config.settlement?.tokenAddress}
        />
      </div>
    </WidgetLayout>
  );
}
