import { PhantomIcon } from "@dynamic-labs/iconic";
import type { ParsedFlowConfig } from "@/lib/flow-config/schema";
import { DEFAULT_FLOW_CONFIGS } from "@/lib/flow-config/defaults";
import {
  decodeFlowConfigFromParams,
  mergeFlowConfig,
} from "@/lib/flow-config/url-codec";
import { parseFlowConfigSafely } from "@/lib/parse-flow-config";
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
import {
  ChipArrow,
  RouteChip,
  ScenarioEyebrow,
  ScenarioSwitcher,
  TopBar,
  prettyChain,
} from "@/components/scenario-chrome";
import { DynamicWalletIcon } from "@/components/icons/dynamic-wallet";
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
  const config = parseFlowConfigSafely(
    mergeFlowConfig(DEFAULT_FLOW_CONFIGS.deposit, overlay),
    "deposit",
  );

  const ctx: FlowSnippetContext = {
    config,
    mode: "deposit",
    // Destination is the user's platform-managed wallet (configured
    // server-side in the Checkout). Only thread an override when the
    // URL overlay supplied one; otherwise the snippet renderer falls
    // back to `DESTINATION_ADDRESS_PLACEHOLDER`.
    destinationAddress: config.destination.address,
    sourceFromAddress: "0xUSER_EXTERNAL_WALLET",
  };

  const codePanelProps = await buildCodePanelProps(
    ctx,
    DEPOSIT_EXTRAS,
    "deposit",
  );

  return (
    <div className="min-h-dvh bg-(--brand-page-bg)">
      <DynamicBootstrap />
      <main className="mx-auto max-w-6xl px-6 pt-8 pb-20">
        <TopBar />
        <DepositHero config={config} />
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-6 self-start">
            <DepositWidgetDemo />
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
    <section className="flex flex-col gap-5 max-w-3xl">
      <ScenarioEyebrow num="02" name="Deposit" />

      <h1 className="!text-[clamp(2rem,4vw,3rem)] !leading-[1.05] text-balance text-(--brand-fg) font-semibold tracking-[-0.02em]">
        Fund a platform balance with any token.{" "}
        <span className="text-(--brand-primary)">
          Settle {config.asset.symbol} on {prettyChain(config.asset.chain)}.
        </span>
      </h1>
      <p className="text-base lg:text-lg text-(--brand-fg-secondary) max-w-2xl">
        Users arrive holding whatever they hold — an external wallet, a Coinbase
        balance, or a token bridged from another chain. Fireblocks Flow
        provides the swap and settlement infrastructure<DisclaimerCite /> to
        credit an embedded wallet, Fireblocks vault, or any provided deposit
        wallet.
      </p>

      <div className="flex items-center gap-3 pt-1">
        <RouteChip
          icon={<PhantomIcon className="h-5 w-5" />}
          label="External wallet"
          detail="Any wallet, chain"
        />
        <ChipArrow />
        <RouteChip
          icon={<DynamicWalletIcon size={20} />}
          label="Embedded or vault"
          detail={assetLine}
        />
      </div>
    </section>
  );
}
