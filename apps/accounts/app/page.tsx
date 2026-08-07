/**
 * Accounts scenario page (Server Component).
 *
 * Shared Dynamic site chrome from `buildScenarioChrome` (same as the
 * dynamic.dev catalog), hero, then the LIVE widget on the left and the SDK
 * integration panel on the right. Snippets are Shiki-highlighted here,
 * server-side; the shared `CodePanel` receives finished HTML. Every panel
 * variant is built up front so the widget-driven swap is instant.
 *
 * Per-config theming (`?theme=`) stays at the layout level (`<ThemeStyleTag>` +
 * `AccountsConfigProvider`); a branded config surfaces its logo via the
 * `<ScenarioBrandLogo>` client island (null under default chrome - the header
 * brands the page).
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
} from "@dynamic-demos/ui";
import { AccountsApp } from "@/components/accounts-app";
import { AccountsPanel } from "@/components/accounts-panel";
import { ScenarioBrandLogo } from "@/components/scenario-brand-logo";
import { PanelSectionProvider } from "@/contexts/panel-section-context";
import {
  ACCOUNTS_ACCOUNT_STEPS,
  ACCOUNTS_ADD_WALLET_STEPS,
  ACCOUNTS_MEMBER_STEPS,
  ACCOUNTS_RENAME_STEPS,
  ACCOUNTS_SDK_STEPS,
  ACCOUNTS_SEND_STEPS,
  ACCOUNTS_SIGNER_STEPS,
  ACCOUNTS_SIGNING_STEPS,
  ACCOUNTS_TRANSACTION_STEPS,
  ACCOUNTS_WALLET_STEPS,
  buildCodeSteps,
} from "@/lib/code-steps";

export default async function Home() {
  // Brand scope decides logo placement: above the hero title under page scope,
  // centered above the widget under widget scope. Same headers the layout uses
  // for style scoping; the config fetch dedupes with the layout's call.
  const headersList = await headers();
  const themeScope =
    headersList.get("x-accounts-theme-scope") === "widget" ? "widget" : "page";
  const { resolved: isBranded } = await fetchDemoConfigResult<WidgetConfig>({
    demoType: "accounts",
    id: headersList.get("x-accounts-config-id"),
    fallback: {},
  });

  // One call for the chrome contract: a branded demo drops the Dynamic site
  // header for full immersion and carries Book a call in the hero brand row
  // instead, so header and hero logo are two halves of one decision.
  const chrome = buildScenarioChrome({
    chip: "Accounts",
    isBranded,
    brandLogo: <ScenarioBrandLogo align="start" />,
    logoPlacement: themeScope === "widget" ? "widget" : "hero",
  });

  const [
    sdkSteps,
    accountSteps,
    renameSteps,
    walletSteps,
    addWalletSteps,
    transactionSteps,
    sendSteps,
    signingSteps,
    signerSteps,
    memberSteps,
  ] = await Promise.all([
      buildCodeSteps(ACCOUNTS_SDK_STEPS),
      buildCodeSteps(ACCOUNTS_ACCOUNT_STEPS),
      buildCodeSteps(ACCOUNTS_RENAME_STEPS),
      buildCodeSteps(ACCOUNTS_WALLET_STEPS),
      buildCodeSteps(ACCOUNTS_ADD_WALLET_STEPS),
      buildCodeSteps(ACCOUNTS_TRANSACTION_STEPS),
      buildCodeSteps(ACCOUNTS_SEND_STEPS),
      buildCodeSteps(ACCOUNTS_SIGNING_STEPS),
      buildCodeSteps(ACCOUNTS_SIGNER_STEPS),
      buildCodeSteps(ACCOUNTS_MEMBER_STEPS),
    ]);

  const earlyAccessNotice = (
    <PanelNotice eyebrow="Business Accounts" eyebrowSuffix="early access">
      Business accounts are in early access. Talk to Dynamic to enable them on
      your environment.
    </PanelNotice>
  );

  // Carried by every screen that acts WITH a wallet - the point holds whether
  // the reader is looking at history, a send, or a signature.
  const ordinaryWalletNotice = (
    <PanelNotice
      eyebrow="Ordinary wallet calls"
      eyebrowSuffix="no business-account API"
    >
      A wallet the account owns and you hold a share for is just a wallet
      account. Reading its balance and sending from it use the same calls as any
      embedded wallet - the co-signing lives in how the key was shared.
    </PanelNotice>
  );

  return (
    <PanelSectionProvider>
      <ScenarioLayout
        header={chrome.header}
        hero={
          <ScenarioHero
            logo={chrome.heroLogo}
            title="A wallet your users share."
            titleAccent="One team, many signers."
            pitch="Give a company an embedded MPC wallet instead of giving it to one employee. Every teammate holds their own share, and managing the roster stays separate from signing with it - built entirely on Dynamic."
          />
        }
        demo={
          // brand-scope: under ?scope=widget a branded config restyles ONLY
          // this subtree; under page scope the overrides sit on :root and this
          // class is inert.
          <div className="brand-scope mx-auto w-full max-w-[440px] lg:mx-0">
            {themeScope === "widget" && <ScenarioBrandLogo align="center" />}
            <AccountsApp />
          </div>
        }
        panel={
          <AccountsPanel
            panels={{
              default: (
                <CodePanel sdkSteps={sdkSteps} notice={earlyAccessNotice} />
              ),
              accounts: (
                <CodePanel sdkSteps={accountSteps} notice={earlyAccessNotice} />
              ),
              rename: <CodePanel sdkSteps={renameSteps} />,
              wallets: (
                <CodePanel sdkSteps={walletSteps} />
              ),
              "add-wallet": <CodePanel sdkSteps={addWalletSteps} />,
              transactions: (
                <CodePanel
                  sdkSteps={transactionSteps}
                  notice={ordinaryWalletNotice}
                />
              ),
              send: (
                <CodePanel sdkSteps={sendSteps} notice={ordinaryWalletNotice} />
              ),
              signing: (
                <CodePanel
                  sdkSteps={signingSteps}
                  notice={ordinaryWalletNotice}
                />
              ),
              signers: (
                <CodePanel
                  sdkSteps={signerSteps}
                  notice={
                    <PanelNotice
                      eyebrow="Step-up required"
                      eyebrowSuffix="elevated access token"
                    >
                      Adding or revoking a signer needs fresh verification. The
                      widget prompts for it, then the SDK attaches the scoped
                      token to the call automatically.
                    </PanelNotice>
                  }
                />
              ),
              members: (
                <CodePanel sdkSteps={memberSteps} />
              ),
            }}
          />
        }
        footer={chrome.footer}
      />
    </PanelSectionProvider>
  );
}
