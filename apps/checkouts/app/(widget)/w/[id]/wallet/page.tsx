import { notFound } from "next/navigation";
import EmbeddedWalletWidget from "@/components/embedded-wallet-widget";
import WidgetLayout from "@/components/widget-layout";
import WidgetNav from "@/components/widget-nav";
import { getCheckoutConfig } from "@/lib/api/checkouts";

/**
 * Embedded Wallet Page
 *
 * Shows the user's embedded wallet for a specific checkout configuration.
 * Only accessible when depositDestination is "embedded".
 * URL: /w/[id]/wallet
 */
export default async function WalletPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch config from dashboard API
  const storedConfig = await getCheckoutConfig(id);
  if (!storedConfig) notFound();

  const { config } = storedConfig;

  // Only allow access if embedded wallet is enabled
  if (config.depositDestination !== "embedded") {
    notFound();
  }

  return (
    <WidgetLayout config={config} footer={<WidgetNav widgetId={id} />}>
      <div className="w-full max-w-[385px]">
        <EmbeddedWalletWidget
          widgetId={id}
          settlementChainType={config.settlement?.chain}
          settlementChainId={config.settlement?.chainId}
          settlementTokenAddress={config.settlement?.tokenAddress}
        />
      </div>
    </WidgetLayout>
  );
}
