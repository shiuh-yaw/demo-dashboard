"use client";

/**
 * Panel-section bridge (Q-017 slice 1) — lets widget screens drive which
 * content the scenario page's right-side code panel shows. The provider
 * wraps the RSC-composed <ScenarioLayout> in app/page.tsx so both islands
 * (the widget's screens and <WalletPanel>) share the state. The shared
 * CodePanel stays presentational; this screen→panel mapping is
 * wallet-owned content.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SendChain } from "@/lib/send-chains";

export type PanelSection =
  | "default"
  | "jwt-setup"
  | "wallets"
  | "transactions"
  | `send-${SendChain}`;

const PanelSectionContext = createContext<{
  section: PanelSection;
  setSection: (section: PanelSection) => void;
} | null>(null);

export function PanelSectionProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<PanelSection>("default");
  return (
    <PanelSectionContext.Provider value={{ section, setSection }}>
      {children}
    </PanelSectionContext.Provider>
  );
}

/**
 * No-op outside the provider (e.g. /jwt, tests) so screens can call it
 * unconditionally.
 */
export function usePanelSection(): {
  section: PanelSection;
  setSection: (section: PanelSection) => void;
} {
  const ctx = useContext(PanelSectionContext);
  return ctx ?? { section: "default", setSection: () => {} };
}

/**
 * Declare which panel section a screen owns: set on mount, restore
 * "default" on unmount. Only for top-level screens — a component nested
 * inside a screen must not use this (its unmount would reset the panel
 * while the parent screen is still up).
 */
export function usePanelSectionEffect(section: PanelSection) {
  const { setSection } = usePanelSection();
  useEffect(() => {
    setSection(section);
    return () => setSection("default");
  }, [section, setSection]);
}
