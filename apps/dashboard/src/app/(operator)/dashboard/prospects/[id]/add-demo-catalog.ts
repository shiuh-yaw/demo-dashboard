/**
 * Pure catalog-row builder for the prospect hub's "Add Demo" picker. No React
 * import - stays unit-testable without a DOM. Lists prospect-bindable kinds
 * created in the dashboard (earn/wallet/remittance/trade/flow/card); kinds with
 * their own external console (checkout) are excluded. A kind already built for
 * the prospect is "added" (no duplicate-create path), the rest "creatable".
 */

import { LANDING_DEMOS } from "@/lib/landing/demos";
import {
  CONFIGURABLE_KIND_TO_DEMO_TYPE,
  isConfigurableKind,
} from "@/lib/analytics/demo-kind";
import { EXTERNAL_CONSOLE_HREF } from "@/components/shared/demo-editor-metadata";
import type { ProspectDemos } from "@/lib/types/dashboard";
import type { DemoConfigKind } from "@/lib/services/types";

export type AddDemoStatus = "added" | "creatable";

export type ProspectDemoType =
  | "earn"
  | "checkout"
  | "wallet"
  | "remittance"
  | "trade"
  | "flow"
  | "card";

export interface AddDemoRow {
  kind: DemoConfigKind;
  slug: string;
  name: string;
  tagline: string;
  status: AddDemoStatus;
  /** Existing demo config id - set only when status is "added". */
  demoConfigId?: string;
  /** Prospect-bound demo-type key. */
  demoType: ProspectDemoType;
}

/** Prospect-bindable catalog entries, in catalog order. */
export function buildAddDemoCatalog(demos: ProspectDemos): AddDemoRow[] {
  return LANDING_DEMOS.flatMap((demo) => {
    if (!demo.kind || !isConfigurableKind(demo.kind)) return [];
    // Kinds edited in their own console (checkout) aren't created here.
    if (EXTERNAL_CONSOLE_HREF[demo.kind]) return [];
    const demoType = CONFIGURABLE_KIND_TO_DEMO_TYPE[demo.kind];
    const demoConfigId = demos[demoType];
    return [
      {
        kind: demo.kind,
        slug: demo.slug,
        name: demo.name,
        tagline: demo.tagline,
        status: demoConfigId ? "added" : "creatable",
        demoConfigId,
        demoType,
      },
    ];
  });
}
