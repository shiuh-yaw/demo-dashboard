/**
 * Remittance scenario page (Server Component) - the demo's front door,
 * fourth consumer of the shared scenario chrome after wallet, earn, and
 * trade. Live login card on the left (same screens as the retired
 * /login; sign-in exits to /overview), SDK integration panel on the
 * right. Snippets are Shiki-highlighted here, server-side.
 *
 * "/" IS the login surface: authenticated visitors are bounced to
 * /overview by the middleware before this page renders; unauth users
 * on protected routes land here with ?returnTo=, which flows into the
 * login card. The legacy /login route 307s to "/" with the query
 * preserved.
 *
 * Branded configs (?theme=) hide the Dynamic site header, surface the
 * brand logo in the hero row, and add a Book a call CTA (wallet/earn/
 * trade parity); the SiteFooter stays under every theme.
 */

import { headers } from "next/headers";
import {
  CodePanel,
  ScenarioBrandRow,
  ScenarioHero,
  ScenarioLayout,
  SdkStack,
  SiteFooter,
  SiteHeader,
} from "@dynamic-demos/ui";
import { LoginPage } from "@/components/login-page";
import { ResetThemeButton } from "@/components/reset-theme-button";
import { ScenarioBrandLogo } from "@/components/scenario-brand-logo";
import { RemittancePanel } from "@/components/remittance-panel";
import { PanelSectionProvider } from "@/contexts/panel-section-context";
import {
  buildCodeSteps,
  REMITTANCE_OTP_STEPS,
  REMITTANCE_SDK_STEPS,
} from "@/lib/code-steps";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const returnTo =
    typeof params.returnTo === "string" ? params.returnTo : undefined;

  const headersList = await headers();
  const configId = headersList.get("x-remittance-config-id");
  // Branded demos drop the Dynamic site header (full immersion) and
  // carry the brand logo + a Book a call CTA in the hero row instead.
  // Branding comes from RemittanceConfigProvider (root layout fetch);
  // <ScenarioBrandLogo> reads it client-side.
  const isBranded = !!configId;

  const [sdkSteps, otpSteps] = await Promise.all([
    buildCodeSteps(REMITTANCE_SDK_STEPS),
    buildCodeSteps(REMITTANCE_OTP_STEPS),
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
          header={
            isBranded ? undefined : (
              <SiteHeader homeHref="https://dynamic.dev" chip="Remittance" />
            )
          }
          hero={
            <ScenarioHero
              logo={
                isBranded ? (
                  <ScenarioBrandRow logo={<ScenarioBrandLogo />} />
                ) : undefined
              }
              title="Send money anywhere."
              titleAccent="Stablecoin rails underneath."
              pitch="Email, social, or your own auth - senders sign in the way they already do, and an embedded MPC wallet appears behind the scenes, funded in USDC. Recipients get local currency over their local payment rails. And because users custody their own funds, expanding into new regions doesn't start with a licensing project. Built on Dynamic + Fireblocks."
            />
          }
          demo={
            <div className="w-full max-w-[440px] mx-auto lg:mx-0">
              <LoginPage returnToOverride={returnTo} />
            </div>
          }
          panel={
            <RemittancePanel
              panels={{
                default: (
                  <CodePanel
                    sdkSteps={sdkSteps}
                    notice={builtWithNotice}
                  />
                ),
                "otp-verify": (
                  <CodePanel
                    sdkSteps={otpSteps}
                    notice={builtWithNotice}
                  />
                ),
              }}
            />
          }
          footer={
            <SiteFooter
              extraLinks={<ResetThemeButton />}
            />
          }
        />
      </div>
    </PanelSectionProvider>
  );
}
