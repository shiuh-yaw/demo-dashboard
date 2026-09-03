/**
 * Rimau scenario page (Server Component) - the demo's front door and its
 * sign-in surface. Live sign-in card on the left (beat 1: social login,
 * silent wallet creation, straight into the exchange), the SDK integration
 * panel on the right, one step per beat. Snippets are Shiki-highlighted here,
 * server-side.
 *
 * Signed-in visitors bounce to /portfolio from the card itself; a lost
 * device (beat 4) lands back here and the same card becomes the second
 * device's sign-in. Branded configs (?theme=) drop the Dynamic site header
 * and carry the prospect logo in the hero row instead.
 */

import {
  buildScenarioChrome,
  CodePanel,
  ScenarioHero,
  ScenarioLayout,
  SdkStack,
} from "@dynamic-demos/ui";
import { SignInCard } from "@/components/sign-in-card";
import { ScenarioBrandLogo } from "@/components/scenario-brand-logo";
import { PresenterRail } from "@/components/presenter-rail";
import { getRimauConfig } from "@/lib/get-rimau-config";
import { buildCodeSteps, RIMAU_SDK_STEPS } from "@/lib/code-steps";

export default async function HomePage() {
  const { isBranded } = await getRimauConfig();
  const chrome = buildScenarioChrome({
    chip: "Rimau",
    isBranded,
    brandLogo: <ScenarioBrandLogo />,
  });
  const sdkSteps = await buildCodeSteps(RIMAU_SDK_STEPS);

  const builtWithNotice = (
    <SdkStack
      packages={["@dynamic-labs-sdk/client", "@dynamic-labs-sdk/evm", "@dynamic-labs-sdk/zerodev"]}
      link={{
        label: "Embedded wallet architecture",
        href: "https://www.dynamic.xyz/docs/javascript/wallets/embedded-wallets/mpc/architecture",
      }}
    />
  );

  return (
    <>
      <ScenarioLayout
        header={chrome.header}
        hero={
          <ScenarioHero
            logo={chrome.heroLogo}
            title="A non-custodial wallet inside the exchange."
            titleAccent="No seed phrase. No custody."
            pitch="A regional retail exchange with three million users, custodial today on a self-built signing stack, wants the wallet inside its app without becoming the custodian - and without losing power users to outside wallets. Sign in with Google, get a 2-of-2 TSS-MPC wallet silently, take a yield position from inside the app, send with zero ETH, lose the device and recover without a phrase, then see exactly who holds what. Built entirely on Dynamic."
          />
        }
        demo={
          <div className="w-full max-w-[440px] mx-auto lg:mx-0">
            <SignInCard />
          </div>
        }
        panel={<CodePanel sdkSteps={sdkSteps} notice={builtWithNotice} />}
        footer={chrome.footer}
      />
      <PresenterRail />
    </>
  );
}
