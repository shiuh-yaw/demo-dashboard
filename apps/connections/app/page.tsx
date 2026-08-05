/**
 * Connect scenario page (Server Component).
 *
 * The shared scenario shape: site chrome, hero, the LIVE connect widget on the
 * left and the integration guide on the right. The panel renders the upstream
 * guide's own sections (components/docs-sections.tsx) behind platform / mode
 * tabs - the only surface for that guide now.
 *
 * The widget rendered here is the same component `/connect` serves bare - this
 * page only wraps it. Per-config theming (`?theme=`) stays at the layout level.
 */

import {
  buildScenarioChrome,
  FlowMark,
  ScenarioHero,
  ScenarioLayout,
} from "@dynamic-demos/ui";

import { ConnectFlowLazy } from "@/components/connect-flow-lazy";
import { PlatformPanel } from "@/components/platform-panel";
import { getConnectConfig } from "@/lib/connections-config";
import { loadNativeSources } from "@/lib/native-sources";

export default async function Home() {
  const { config, isBranded } = await getConnectConfig();
  // One call for the whole chrome contract - header vs brand row, the prospect
  // logo, the theme reset, the shared footer. Assembling these by hand is how
  // each piece went missing in turn.
  const chrome = buildScenarioChrome({
    chip: "Connections",
    siteLogo: <FlowMark />,
    isBranded,
    brandLogoUrl: config.branding?.logoUrl,
  });

  // The panel renders the upstream integration guide itself (components/
  // docs-sections.tsx) rather than a paraphrase of it; the tabs pick a section.
  const native = await loadNativeSources();

  return (
    <ScenarioLayout
      header={chrome.header}
      hero={
        <ScenarioHero
          logo={chrome.heroLogo}
          title="Let users bring the wallet they already have."
          titleAccent="Read-only by design."
          pitch="Connect-only login across 600+ EVM and Solana wallets. Dynamic returns just the public address - nothing signed, no custody - then redirects back to you. Drop it in an iframe or a native webview."
        />
      }
      demo={
        <div className="w-full max-w-[440px] mx-auto lg:mx-0">
          {/* De-shells the widget's full-viewport `.page` for this column;
              the embed routes keep upstream's geometry. */}
          <div data-connect-surface="scenario">
            <ConnectFlowLazy />
          </div>
        </div>
      }
      panel={<PlatformPanel sources={native} />}
      footer={chrome.footer}
    />
  );
}
