import { BaseChainIcon, MetaMaskIcon } from "@dynamic-labs/iconic";
import type { ParsedFlowConfig } from "@/lib/flow-config/schema";
import { DEFAULT_FLOW_CONFIGS } from "@/lib/flow-config/defaults";
import {
  decodeFlowConfigFromParams,
  mergeFlowConfig,
} from "@/lib/flow-config/url-codec";
import { parseFlowConfigSafely } from "@/lib/parse-flow-config";
import { buildCodePanelProps } from "@/lib/build-code-panel-props";
import { WITHDRAW_EXTRAS } from "@/lib/flow-helpers";
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
import { WithdrawWidgetDemo } from "./components/widget-demo";

// Snippet placeholder for the destination address — the live widget
// fills in whatever the user types into the destination form. We
// surface a recognizable placeholder so devs reading the code panel
// know that field is user-supplied at runtime, not baked in.
const SNIPPET_PLACEHOLDER_EXTERNAL = "0xUSER_EXTERNAL_WALLET";

/**
 * /withdraw — hero + a two-column "widget on the left, code on the
 * right" arrangement. Unlike `/checkout` and `/deposit`, the withdraw
 * widget MINTS a fresh Checkout per transaction (the destination
 * address comes from the user) via `POST /api/checkouts`. The code
 * panel uses the user-external placeholder for the destination so the
 * snippets read as scenario-correct.
 */
export default async function WithdrawPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const overlay = decodeFlowConfigFromParams(params);
  const config = parseFlowConfigSafely(
    mergeFlowConfig(DEFAULT_FLOW_CONFIGS.withdraw, overlay),
    "withdraw",
  );

  const ctx: FlowSnippetContext = {
    config,
    mode: "withdraw",
    destinationAddress: SNIPPET_PLACEHOLDER_EXTERNAL,
    sourceFromAddress: "0xEMBEDDED_WALLET",
  };

  const codePanelProps = await buildCodePanelProps(
    ctx,
    WITHDRAW_EXTRAS,
    "withdraw",
  );

  return (
    <div>
      <DynamicBootstrap />
      <main className="mx-auto max-w-6xl px-6 pt-8 pb-20">
        <WithdrawHero config={config} />
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sticky offset clears the layout's h-20 sticky bar
              (SiteHeader unbranded, the brand bar under ?theme=). */}
          <div className="lg:col-span-5 lg:sticky lg:top-[104px] self-start">
            <WithdrawWidgetDemo />
            <TransactionDisclaimer />
          </div>
          <div className="lg:col-span-7">
            <CodePanel {...codePanelProps} />
          </div>
        </div>
        <ScenarioSwitcher active="withdraw" />
        <FullDisclaimer />
      </main>
    </div>
  );
}

// =============================================================================
// Hero
// =============================================================================

function WithdrawHero({ config }: { config: ParsedFlowConfig }) {
  const assetLine = `${config.asset.symbol} on ${prettyChain(config.asset.chain)}`;

  return (
    <ScenarioHero
      eyebrow={{ num: "03", name: "Withdraw" }}
      title="Cash out to any wallet."
      titleAccent="Any chain, any token."
      pitch={
        <>
          Pull from a Fireblocks vault, embedded wallet, or any external
          source and settle directly to the user&apos;s wallet of choice.
          Fireblocks Flow provides the swap, settlement, and webhook
          infrastructure
          <DisclaimerCite />.
        </>
      }
      chips={
        <>
          <RouteChip
            icon={<BaseChainIcon className="h-5 w-5" />}
            label="Platform wallet"
            detail={assetLine}
          />
          <ChipArrow />
          <RouteChip
            icon={<MetaMaskIcon className="h-5 w-5" />}
            label="User wallet"
            detail="Any token, chain"
          />
        </>
      }
    />
  );
}
