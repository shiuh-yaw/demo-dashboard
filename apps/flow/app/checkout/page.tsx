import { BaseChainIcon, EthereumIcon } from "@dynamic-labs/iconic";
import type { ParsedFlowConfig } from "@/lib/flow-config/schema";
import { DEFAULT_FLOW_CONFIGS } from "@/lib/flow-config/defaults";
import {
  decodeFlowConfigFromParams,
  mergeFlowConfig,
} from "@/lib/flow-config/url-codec";
import { parseFlowConfigSafely } from "@/lib/parse-flow-config";
import { resolveDestinationOverride } from "@/lib/destination-override";
import { buildCodePanelProps } from "@/lib/build-code-panel-props";
import { CHECKOUT_EXTRAS } from "@/lib/flow-helpers";
import type { FlowSnippetContext } from "@/lib/flow-snippets";
import { DynamicBootstrap } from "@/components/DynamicBootstrap";
import {
  DisclaimerCite,
  FullDisclaimer,
  TransactionDisclaimer,
} from "@/components/disclaimer";
import { CodePanel } from "@/components/code-panel";
import { ChipArrow, RouteChip, ScenarioHero } from "@dynamic-demos/ui";
import { ScenarioSwitcher, prettyChain } from "@/components/scenario-chrome";
import { CheckoutWidgetDemo } from "./components/widget-demo";

/**
 * /checkout — scene-setting hero + a two-column "widget on the left,
 * code on the right" arrangement that lets devs run the flow and read
 * the integration in the same view.
 *
 * The widget slot is a fixed-width container that hosts `<CheckoutWidget>`
 * from `@dynamic-demos/checkouts-widget`. Code samples reflect the
 * resolved FlowConfig and switch between TypeScript SDK and REST API
 * via Droplet `Tabs`.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const overlay = decodeFlowConfigFromParams(params);
  const baseConfig = parseFlowConfigSafely(
    mergeFlowConfig(DEFAULT_FLOW_CONFIGS.checkout, overlay),
    "checkout",
  );

  const override = resolveDestinationOverride(params, baseConfig.asset.symbol);
  const config = override
    ? parseFlowConfigSafely(
        mergeFlowConfig(baseConfig, {
          destination: { ...baseConfig.destination, address: override.address },
          asset: { ...baseConfig.asset, chain: override.networkKey },
        }),
        "checkout",
      )
    : baseConfig;

  const ctx: FlowSnippetContext = {
    config,
    mode: "payment",
    // Destination is configured server-side in the Checkout; only thread
    // an override when the URL supplied one. Otherwise the snippet
    // renderer falls back to `DESTINATION_ADDRESS_PLACEHOLDER`.
    destinationAddress: config.destination.address,
    sourceFromAddress: "0xBUYER",
  };

  const codePanelProps = await buildCodePanelProps(
    ctx,
    CHECKOUT_EXTRAS,
    "payment",
  );

  return (
    <div>
      <DynamicBootstrap />
      <main className="mx-auto max-w-6xl px-6 pt-8 pb-20">
        <CheckoutHero config={config} />
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sticky offset clears the layout's h-20 sticky bar
              (SiteHeader unbranded, the brand bar under ?theme=). */}
          <div className="lg:col-span-5 lg:sticky lg:top-[104px] self-start">
            <CheckoutWidgetDemo destinationOverride={override} />
            <TransactionDisclaimer />
          </div>
          <div className="lg:col-span-7">
            <CodePanel {...codePanelProps} />
          </div>
        </div>
        <ScenarioSwitcher active="checkout" />
        <FullDisclaimer />
      </main>
    </div>
  );
}

// =============================================================================
// Hero
// =============================================================================

function CheckoutHero({ config }: { config: ParsedFlowConfig }) {
  const assetLine = `${config.asset.symbol} on ${prettyChain(config.asset.chain)}`;

  return (
    <ScenarioHero
      eyebrow={{ num: "01", name: "Checkout" }}
      title="Accept any crypto."
      titleAccent={`Settle ${config.asset.symbol} on ${prettyChain(config.asset.chain)}.`}
      pitch={
        <>
          The buyer pays with any token from any wallet. The merchant&apos;s
          vault receives the configured stablecoin every time - Fireblocks
          Flow provides the swap, settlement, and webhook infrastructure
          <DisclaimerCite />.
        </>
      }
      chips={
        <>
          <RouteChip
            icon={<EthereumIcon className="h-5 w-5" />}
            label="Buyer wallet"
            detail="Any wallet, chain"
          />
          <ChipArrow />
          <RouteChip
            icon={<BaseChainIcon className="h-5 w-5" />}
            label="Merchant vault"
            detail={assetLine}
          />
        </>
      }
    />
  );
}

