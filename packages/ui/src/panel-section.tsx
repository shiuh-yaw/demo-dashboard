"use client";

/**
 * Panel-section bridge factory (Q-017, originated in apps/wallet) -
 * lets widget screens drive which content a scenario page's code panel
 * shows. Apps instantiate with their own section-id union and a
 * default section; the returned provider wraps the RSC-composed
 * <ScenarioLayout> so both islands (the widget's screens and the
 * panel switcher) share the state. CodePanel stays presentational;
 * the screen→panel mapping is app-owned content.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface PanelSectionApi<Section extends string> {
  PanelSectionProvider: (props: { children: ReactNode }) => ReactNode;
  /**
   * No-op outside the provider (e.g. secondary routes, tests) so
   * screens can call it unconditionally.
   */
  usePanelSection: () => {
    section: Section;
    setSection: (section: Section) => void;
  };
  /**
   * Declare which panel section a screen owns: set on mount, restore
   * the default on unmount. Only for top-level screens - a component
   * nested inside a screen must not use this (its unmount would reset
   * the panel while the parent screen is still up).
   */
  usePanelSectionEffect: (section: Section) => void;
}

export function createPanelSectionContext<Section extends string>(
  defaultSection: Section,
): PanelSectionApi<Section> {
  const PanelSectionContext = createContext<{
    section: Section;
    setSection: (section: Section) => void;
  } | null>(null);

  function PanelSectionProvider({ children }: { children: ReactNode }) {
    const [section, setSection] = useState<Section>(defaultSection);
    return (
      <PanelSectionContext.Provider value={{ section, setSection }}>
        {children}
      </PanelSectionContext.Provider>
    );
  }

  function usePanelSection() {
    const ctx = useContext(PanelSectionContext);
    return ctx ?? { section: defaultSection, setSection: () => {} };
  }

  function usePanelSectionEffect(section: Section) {
    const { setSection } = usePanelSection();
    useEffect(() => {
      setSection(section);
      return () => setSection(defaultSection);
    }, [section, setSection]);
  }

  return { PanelSectionProvider, usePanelSection, usePanelSectionEffect };
}
