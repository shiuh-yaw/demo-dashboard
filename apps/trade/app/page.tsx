/**
 * Trade scenario page (Server Component) - the demo's front door, third
 * consumer of the shared scenario chrome after wallet and earn. Live
 * login card on the left (same screens as the retired /login; sign-in
 * exits to the full-screen app), SDK integration panel on the right.
 * Snippets are Shiki-highlighted here, server-side.
 *
 * "/" IS the login surface: authenticated visitors are bounced to
 * /portfolio by the middleware before this page renders; unauth users
 * on protected routes land here with ?returnTo=, which flows into the
 * login card. OAuth redirects land back here (redirectUrl is the
 * initiating page) and AuthScreen completes them. Dark mode is forced
 * light on this route (app/providers.tsx) - the site chrome is
 * light-only.
 *
 * Branded configs (?theme=) hide the Dynamic site header, surface the
 * brand logo in the hero row, and add a Book a call CTA (wallet/earn
 * parity); the SiteFooter stays under every theme.
 */

import {
  buildScenarioChrome,
  CodePanel,
  ScenarioHero,
  ScenarioLayout,
  SdkStack,
} from "@dynamic-demos/ui";
import { LoginPage } from "@/components/login-page";
import { ScenarioBrandLogo } from "@/components/scenario-brand-logo";
import { TradePanel } from "@/components/trade-panel";
import { PanelSectionProvider } from "@/contexts/panel-section-context";
import { getTradeConfig } from "@/lib/get-trade-config";
import {
  buildCodeSteps,
  TRADE_OTP_STEPS,
  TRADE_SDK_STEPS,
} from "@/lib/code-steps";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const returnTo =
    typeof params.returnTo === "string" ? params.returnTo : undefined;

  const { isBranded } = await getTradeConfig();
  // Branded demos drop the Dynamic site header (full immersion) and
  // carry the brand logo + a Book a call CTA in the hero row instead.
  // Branding comes from TradeConfigProvider (root layout fetch);
  // <ScenarioBrandLogo> reads it client-side.
  // One call for the chrome contract - header vs brand row, the theme reset in
  // the footer, the shared footer itself. See buildScenarioChrome.
  const chrome = buildScenarioChrome({
    chip: "Trade",
    isBranded,
    brandLogo: <ScenarioBrandLogo />,
  });

  const [sdkSteps, otpSteps] = await Promise.all([
    buildCodeSteps(TRADE_SDK_STEPS),
    buildCodeSteps(TRADE_OTP_STEPS),
  ]);

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
      {/* data-scenario-page lifts the app shell's html/body overflow
          lock (globals.css) so this page scrolls like a document. */}
      <div data-scenario-page>
      <ScenarioLayout
        header={chrome.header}
        hero={
          <ScenarioHero
            logo={chrome.heroLogo}
            title="Trade everything."
            titleAccent="One app, every market."
            pitch="Users scatter across apps because no single one offers every market. Give them an invisible embedded MPC wallet at login - no seed phrase, no extension - and put token markets, real-world events, and onchain swaps behind one familiar interface and one unified portfolio. Become the place where your users trade everything - built entirely on Dynamic."
          />
        }
        demo={
          <div className="w-full max-w-[440px] mx-auto lg:mx-0">
            <LoginPage returnToOverride={returnTo} />
          </div>
        }
        panel={
          <TradePanel
            panels={{
              default: (
                <CodePanel sdkSteps={sdkSteps} notice={builtWithNotice} />
              ),
              "otp-verify": (
                <CodePanel sdkSteps={otpSteps} notice={builtWithNotice} />
              ),
            }}
          />
        }
        footer={chrome.footer}
      />
      </div>
    </PanelSectionProvider>
  );
}
