/**
 * Earn scenario page (Server Component) - the demo's front door, second
 * consumer of the shared scenario chrome after wallet. Live login card
 * on the left (same LoginContent as /login; sign-in exits to the
 * full-screen /earn app), SDK integration panel on the right. Snippets
 * are Shiki-highlighted here, server-side.
 *
 * Branded configs (?theme=) hide the Dynamic site header, surface the
 * brand logo in the hero row, and add a Book a call CTA (wallet
 * parity). "/" IS the login surface: authenticated visitors are bounced
 * to /earn by the middleware before this page renders; OAuth redirects
 * land back here and LoginContent completes them (the middleware's
 * oauthCallbackParams exemption lets them through).
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
import { EarnPanel } from "@/components/earn-panel";
import { ResetThemeButton } from "@/components/reset-theme-button";
import { ScenarioBrandLogo } from "@/components/scenario-brand-logo";
import { ScenarioWidget } from "@/components/scenario-widget";
import { LoginCleanup } from "@/components/login-cleanup";
import { PanelSectionProvider } from "@/contexts/panel-section-context";
import {
  buildCodeSteps,
  EARN_OTP_STEPS,
  EARN_SDK_STEPS,
} from "@/lib/code-steps";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  // OAuth callback (redirectUrl is the initiating page, so the provider
  // sends the user back here) - LoginContent shows the completing
  // spinner immediately instead of a flash of the login form.
  const isOAuthCallback = !!(
    params.dynamicOauthCode ||
    (params.code && params.state)
  );

  const headersList = await headers();
  const configId = headersList.get("x-earn-config-id");
  // Branded demos drop the Dynamic site header (full immersion) and
  // carry the brand logo + a Book a call CTA in the hero row instead.
  // Branding itself comes from EarnConfigProvider (root layout fetch);
  // <ScenarioBrandLogo> reads it client-side.
  const isBranded = !!configId;

  const [sdkSteps, otpSteps] = await Promise.all([
    buildCodeSteps(EARN_SDK_STEPS),
    buildCodeSteps(EARN_OTP_STEPS),
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
      <ScenarioLayout
        header={
          isBranded ? undefined : (
            <SiteHeader chip="Earn" />
          )
        }
        hero={
          <ScenarioHero
            logo={
              isBranded ? (
                <ScenarioBrandRow logo={<ScenarioBrandLogo />} />
              ) : undefined
            }
            title="Stablecoin yield, embedded in your product."
            titleAccent="No wallet setup required."
            pitch="Sign in with email or a social account, create a non-custodial MPC wallet in one call - no seed phrase, no extension - then deposit USDC into curated vaults, track positions, and withdraw anytime. Built entirely on Dynamic."
          />
        }
        demo={
          <div className="w-full max-w-[440px] mx-auto lg:mx-0">
            <LoginCleanup />
            <ScenarioWidget isOAuthCallback={isOAuthCallback} />
            <ResetThemeButton />
          </div>
        }
        panel={
          <EarnPanel
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
        footer={<SiteFooter />}
      />
    </PanelSectionProvider>
  );
}
