"use client";

/**
 * Panel-section bridge (Q-017 slice 1) — lets widget screens drive which
 * content the scenario page's right-side code panel shows. The provider
 * wraps the RSC-composed <ScenarioLayout> in app/page.tsx so both islands
 * (the widget's screens and <WalletPanel>) share the state. Mechanism
 * lives in @dynamic-demos/ui (generalized from this file); wallet owns
 * only its section-id union.
 */

import { createPanelSectionContext } from "@dynamic-demos/ui";
import type { SendChain } from "@/lib/send-chains";

export type PanelSection =
  | "default"
  | "jwt-setup"
  | "wallets"
  | "transactions"
  | "settings"
  | `send-${SendChain}`;

export const { PanelSectionProvider, usePanelSection, usePanelSectionEffect } =
  createPanelSectionContext<PanelSection>("default");
