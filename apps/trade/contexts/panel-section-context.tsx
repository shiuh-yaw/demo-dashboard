"use client";

/**
 * Panel-section bridge (Q-017 pattern) - lets the login card's screens
 * drive which content the scenario page's code panel shows. Only the
 * OTP screen swaps the panel today; the provider wraps the
 * RSC-composed <ScenarioLayout> in app/page.tsx. Mechanism lives in
 * @dynamic-demos/ui; trade owns only its section-id union.
 */

import { createPanelSectionContext } from "@dynamic-demos/ui";

export type PanelSection = "default" | "otp-verify";

export const { PanelSectionProvider, usePanelSection, usePanelSectionEffect } =
  createPanelSectionContext<PanelSection>("default");
