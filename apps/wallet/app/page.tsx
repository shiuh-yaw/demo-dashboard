/**
 * Wallet scenario page (Server Component) - demos-surface phase 2 v2.
 *
 * Flow's scenario-page shape inside the Dynamic site chrome: shared
 * chrome from buildScenarioChrome (same as the dynamic.dev catalog), hero,
 * then the LIVE wallet widget on the left (login card immediately
 * usable; WalletApp handles auth → dashboard internally) and the SDK
 * integration panel on the right. Snippets are Shiki-highlighted here,
 * server-side; the shared CodePanel receives finished HTML. SDK-only -
 * this demo has no public API story of its own.
 *
 * Per-config theming (`?theme=`) stays at the layout level
 * (<ThemeStyleTag> + WalletConfigProvider); branded configs surface
 * their logo via the <ScenarioBrandLogo> client island (null under
 * default chrome - the header brands the page).
 */

import { headers } from "next/headers";
import type { WidgetConfig } from "@dynamic-demos/theme";
import { fetchDemoConfigResult } from "@dynamic-demos/theme/fetch-demo-config";
import {
  buildScenarioChrome,
  CodePanel,
  PanelNotice,
  ScenarioHero,
  ScenarioLayout,
  SdkStack,
} from "@dynamic-demos/ui";
import { WalletApp } from "@/components/wallet-app";
import { ScenarioBrandLogo } from "@/components/scenario-brand-logo";
import { WalletPanel } from "@/components/wallet-panel";
import { PanelSectionProvider } from "@/contexts/panel-section-context";
import {
  buildCodeSteps,
  WALLET_ACCOUNT_STEPS,
  WALLET_JWT_SETUP_STEPS,
  WALLET_SDK_STEPS,
  WALLET_SEND_STEPS_BY_CHAIN,
  WALLET_SETTINGS_STEPS,
  WALLET_TX_STEPS,
} from "@/lib/code-steps";
import { SEND_CHAINS } from "@/lib/send-chains";

export default async function Home() {
  // Brand scope decides logo placement: above the hero title under
  // page scope (full immersion), centered above the widget under
  // widget scope. Same headers the layout uses for the style scoping;
  // the config fetch dedupes with the layout's identical call.
  const headersList = await headers();
  const themeScope =
    headersList.get("x-wallet-theme-scope") === "widget" ? "widget" : "page";
  const { config, resolved: isBranded } = await fetchDemoConfigResult<WidgetConfig>({
    demoType: "wallet",
    id: headersList.get("x-wallet-config-id"),
    fallback: {},
  });
  // Branded demos drop the Dynamic site header (full immersion) and
  // carry a Book a call CTA in the hero's brand row instead.
  // One call for the chrome contract. `logoPlacement` carries the widget-scope
  // case: under ?scope=widget the logo centers over the widget below instead of
  // sitting in the hero, and the brand row keeps Book a call right-aligned.
  const chrome = buildScenarioChrome({
    chip: "Wallet",
    isBranded,
    brandLogo: <ScenarioBrandLogo align="start" />,
    logoPlacement: themeScope === "widget" ? "widget" : "hero",
  });

  // All panel variants are highlighted server-side; the client-side
  // WalletPanel switcher just picks one (Q-017).
  const [
    sdkSteps,
    jwtSetupSteps,
    accountSteps,
    txSteps,
    settingsSteps,
    ...sendStepsList
  ] = await Promise.all([
    buildCodeSteps(WALLET_SDK_STEPS),
    buildCodeSteps(WALLET_JWT_SETUP_STEPS),
    buildCodeSteps(WALLET_ACCOUNT_STEPS),
    buildCodeSteps(WALLET_TX_STEPS),
    buildCodeSteps(WALLET_SETTINGS_STEPS),
    ...SEND_CHAINS.map((chain) =>
      buildCodeSteps(WALLET_SEND_STEPS_BY_CHAIN[chain]),
    ),
  ]);

  // Shared "Built with" callout - shown on the default and wallets panels
  // (the extensions link is how you add more chains to either story).
  const builtWithNotice = (
    <SdkStack
      packages={["@dynamic-labs-sdk/client", "@dynamic-labs-sdk/react-hooks"]}
      link={{
        label: "Add chains via extensions",
        href: "https://www.dynamic.xyz/docs/javascript/reference/adding-extensions",
      }}
    />
  );

  return (
    <PanelSectionProvider>
      <ScenarioLayout
      header={chrome.header}
      hero={
        <ScenarioHero
          logo={chrome.heroLogo}
          title="A wallet your users control."
          titleAccent="No seed phrase required."
          pitch="Sign in with email, social, passkeys, or your own auth and every user gets a non-custodial MPC wallet in seconds - no seed phrase, no extension. Create wallets on any chain, read balances and history, sponsor your users' network fees, and verify sessions on your own backend - built entirely on Dynamic."
        />
      }
      demo={
        // brand-scope: under ?scope=widget a branded config restyles
        // ONLY this subtree (widget + logo); under page scope the
        // overrides sit on :root and this class is inert.
        <div className="brand-scope w-full max-w-[440px] mx-auto lg:mx-0">
          {themeScope === "widget" && <ScenarioBrandLogo align="center" />}
          <WalletApp />
        </div>
      }
      panel={
        <WalletPanel
          panels={{
            default: <CodePanel sdkSteps={sdkSteps} notice={builtWithNotice} />,
            wallets: (
              <CodePanel sdkSteps={accountSteps} notice={builtWithNotice} />
            ),
            transactions: (
              <CodePanel sdkSteps={txSteps} notice={builtWithNotice} />
            ),
            settings: (
              <CodePanel sdkSteps={settingsSteps} notice={builtWithNotice} />
            ),
            ...Object.fromEntries(
              SEND_CHAINS.map((chain, i) => [
                `send-${chain}`,
                <CodePanel
                  key={chain}
                  sdkSteps={sendStepsList[i]!}
                  notice={builtWithNotice}
                />,
              ]),
            ),
            "jwt-setup": (
              <CodePanel
                sdkSteps={jwtSetupSteps}
                notice={
                  <PanelNotice
                    eyebrow="Bring Your Own Auth"
                    eyebrowSuffix="dev-only helper"
                  >
                    The generator on the left stands in for your auth provider
                    - it mints a test JWT that Dynamic verifies against a
                    registered JWKS. The steps below show how you&apos;d wire
                    your real provider in.
                  </PanelNotice>
                }
              />
            ),
          }}
        />
      }
      footer={chrome.footer}
    />
    </PanelSectionProvider>
  );
}
