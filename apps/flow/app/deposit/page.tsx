import { BaseChainIcon, MetaMaskIcon } from "@dynamic-labs/iconic";
import type { ParsedFlowConfig } from "@/lib/flow-config/schema";
import { DEFAULT_FLOW_CONFIGS } from "@/lib/flow-config/defaults";
import {
  decodeFlowConfigFromParams,
  mergeFlowConfig,
} from "@/lib/flow-config/url-codec";
import { parseFlowConfigSafely } from "@/lib/parse-flow-config";
import { resolveDestinationOverride } from "@/lib/destination-override";
import { buildCodePanelProps } from "@/lib/build-code-panel-props";
import { DEPOSIT_EXTRAS } from "@/lib/flow-helpers";
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
import { DepositWidgetDemo } from "./components/widget-demo";

/**
 * /deposit — hero + a two-column "widget on the left, code on the
 * right" arrangement, parallel to `/checkout`. The widget runs
 * `<CheckoutWidget>` in `mode="deposit"` (user-input amount,
 * destination row visible because the user owns the destination).
 *
 * Code samples reflect the resolved FlowConfig and switch between
 * TypeScript SDK and REST API via Droplet `Tabs`.
 */
export default async function DepositPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const overlay = decodeFlowConfigFromParams(params);
  const baseConfig = parseFlowConfigSafely(
    mergeFlowConfig(DEFAULT_FLOW_CONFIGS.deposit, overlay),
    "deposit",
  );

  const override = resolveDestinationOverride(params, baseConfig.asset.symbol);
  const config = override
    ? parseFlowConfigSafely(
        mergeFlowConfig(baseConfig, {
          destination: { ...baseConfig.destination, address: override.address },
          asset: { ...baseConfig.asset, chain: override.networkKey },
        }),
        "deposit",
      )
    : baseConfig;

  const ctx: FlowSnippetContext = {
    config,
    mode: "deposit",
    // Destination is the user's platform-managed wallet (configured
    // server-side in the Checkout). Only thread an override when the
    // URL supplied one; otherwise the snippet renderer falls back to
    // `DESTINATION_ADDRESS_PLACEHOLDER`.
    destinationAddress: config.destination.address,
    sourceFromAddress: "0xUSER_EXTERNAL_WALLET",
  };

  const codePanelProps = await buildCodePanelProps(
    ctx,
    DEPOSIT_EXTRAS,
    "deposit",
  );

  return (
    <div>
      <DynamicBootstrap />
      <main className="mx-auto max-w-6xl px-6 pt-8 pb-20">
        <DepositHero config={config} />
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Widget column pins near the top on scroll (flow header is
              non-sticky, so no h-20 offset is needed). */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 self-start">
            <DepositWidgetDemo destinationOverride={override} />
            <TransactionDisclaimer />
          </div>
          <div className="lg:col-span-7">
            <CodePanel {...codePanelProps} />
          </div>
        </div>
        <ScenarioSwitcher active="deposit" />
        <FullDisclaimer />
      </main>
    </div>
  );
}

// =============================================================================
// Hero
// =============================================================================

function DepositHero({ config }: { config: ParsedFlowConfig }) {
  const assetLine = `${config.asset.symbol} on ${prettyChain(config.asset.chain)}`;

  return (
    <ScenarioHero
      eyebrow={{ num: "02", name: "Deposit" }}
      title="Fund a platform balance with any token."
      titleAccent={`Settle ${config.asset.symbol} on ${prettyChain(config.asset.chain)}.`}
      pitch={
        <>
          Users arrive holding whatever they hold - an external wallet, a
          Coinbase balance, or a token bridged from another chain. Fireblocks
          Flow provides the swap and settlement infrastructure
          <DisclaimerCite /> to credit an embedded wallet, Fireblocks vault, or
          any provided deposit wallet.
        </>
      }
      chips={
        <>
          <RouteChip
            icon={<MetaMaskIcon className="h-5 w-5" />}
            label="External wallet"
            detail="Any wallet, chain"
          />
          <ChipArrow />
          <RouteChip
            icon={<BaseChainIcon className="h-5 w-5" />}
            label="Embedded or vault"
            detail={assetLine}
          />
        </>
      }
    />
  );
}
