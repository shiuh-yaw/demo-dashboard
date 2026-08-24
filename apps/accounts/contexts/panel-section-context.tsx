"use client";

/**
 * Panel-section bridge - lets widget screens drive which content the scenario
 * page's right-side code panel shows. The provider wraps the RSC-composed
 * `<ScenarioLayout>` in `app/page.tsx` so both islands (the widget's screens
 * and `<AccountsPanel>`) share the state. Mechanism lives in
 * `@dynamic-demos/ui`; this app owns only its section-id union.
 */

import { createPanelSectionContext } from "@dynamic-demos/ui";

// One id per screen, not per topic: the panel is read beside a screen, so a
// step for a call that screen does not make is noise.
export type PanelSection =
  | "default"
  | "accounts"
  | "rename"
  | "wallets"
  | "add-wallet"
  | "transactions"
  | "send"
  | "signing"
  | "policies"
  | "signers"
  | "members";

export const { PanelSectionProvider, usePanelSection, usePanelSectionEffect } =
  createPanelSectionContext<PanelSection>("default");
