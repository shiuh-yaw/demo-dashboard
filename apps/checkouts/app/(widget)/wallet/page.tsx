import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";
import EmbeddedWalletWidget from "@/components/embedded-wallet-widget";
import WidgetLayout from "@/components/widget-layout";
import WidgetNav from "@/components/widget-nav";
import { DEPOSIT_CONFIG, createWidgetConfig } from "@/lib/widget-config";

/**
 * Embedded Wallet Page
 *
 * Shows the user's embedded wallet for the active checkout config.
 * Only accessible when `depositDestination === "embedded"`.
 *
 * The brand config id comes from the `x-checkouts-config-id` header
 * (resolved by middleware from `?theme=` or sticky cookie). Reaching
 * this page without a config id — or with one whose stored config
 * doesn't enable the embedded destination — is a 404. There's no
 * "default" embedded wallet flow, so this page deliberately diverges
 * from the entry page's fall-back-to-default behaviour.
 */
export default async function WalletPage() {
  const headersList = await headers();
  const configId = headersList.get("x-checkouts-config-id");
  if (!configId) notFound();

  const fetched = await fetchDemoConfig({
    demoType: "checkout",
    id: configId,
    fallback: DEPOSIT_CONFIG,
  });
  const config = createWidgetConfig(fetched);
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
