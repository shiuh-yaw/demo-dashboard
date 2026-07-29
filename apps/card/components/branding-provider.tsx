"use client";

/**
 * Brand identity for the card UI, seeded server-side from the demo config
 * (`app/layout.tsx` reads `fetchDemoConfig().branding`) and consumed by client
 * components (e.g. the card face logo). Only serializable fields cross the
 * server->client boundary. Theme *colors* travel separately as `--brand-*`
 * CSS vars via `ThemeStyleTag`; this carries the non-CSS bits (name, logo).
 */

import { createContext, useContext, type ReactNode } from "react";

export interface CardBranding {
  /** Brand/company name - used as logo alt text and text fallback. */
  name?: string;
  /** Hosted custom logo URL. When absent, the UI falls back to the Dynamic logo. */
  logoUrl?: string;
}

const BrandingContext = createContext<CardBranding>({});

export function BrandingProvider({
  value,
  children,
}: {
  value: CardBranding;
  children: ReactNode;
}) {
  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): CardBranding {
  return useContext(BrandingContext);
}
