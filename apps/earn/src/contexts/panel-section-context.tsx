"use client";

/**
 * Panel-section bridge (Q-017 pattern, from wallet) - lets the login
 * card's screens drive which content the scenario page's code panel
 * shows. Only the OTP screen swaps the panel today; the provider wraps
 * the RSC-composed <ScenarioLayout> in app/page.tsx.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type PanelSection = "default" | "otp-verify";

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

/** No-op outside the provider (e.g. /login) so screens call it unconditionally. */
export function usePanelSection(): {
  section: PanelSection;
  setSection: (section: PanelSection) => void;
} {
  const ctx = useContext(PanelSectionContext);
  return ctx ?? { section: "default", setSection: () => {} };
}

/**
 * Declare which panel section a screen owns: set on mount, restore
 * "default" on unmount. Top-level screens only.
 */
export function usePanelSectionEffect(section: PanelSection) {
  const { setSection } = usePanelSection();
  useEffect(() => {
    setSection(section);
    return () => setSection("default");
  }, [section, setSection]);
}
