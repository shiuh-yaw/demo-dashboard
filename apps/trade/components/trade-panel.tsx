"use client";

/**
 * Panel switcher (Q-017): picks between server-rendered panel variants
 * by the widget-driven PanelSection state. Variants arrive pre-built
 * (Shiki-highlighted server-side) from app/page.tsx.
 */

import type { ReactNode } from "react";
import {
  usePanelSection,
  type PanelSection,
} from "@/contexts/panel-section-context";

export function TradePanel({
  panels,
}: {
  /** Section -> pre-built panel; missing sections fall back to `default`. */
  panels: Partial<Record<PanelSection, ReactNode>> & { default: ReactNode };
}) {
  const { section } = usePanelSection();
  return <>{panels[section] ?? panels.default}</>;
}
