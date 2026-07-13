"use client";

/**
 * Panel switcher (Q-017 slice 1): picks between server-rendered panel
 * variants by the widget-driven PanelSection state. Both variants arrive
 * pre-built (Shiki-highlighted server-side) from app/page.tsx, so the
 * swap is instant and no highlighting runs in the browser.
 */

import type { ReactNode } from "react";
import {
  usePanelSection,
  type PanelSection,
} from "@/contexts/panel-section-context";

export function WalletPanel({
  panels,
}: {
  /** Section → pre-built panel; missing sections fall back to `default`. */
  panels: Partial<Record<PanelSection, ReactNode>> & { default: ReactNode };
}) {
  const { section } = usePanelSection();
  return <>{panels[section] ?? panels.default}</>;
}
