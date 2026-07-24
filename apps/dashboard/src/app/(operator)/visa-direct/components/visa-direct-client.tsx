"use client";

/**
 * Thin wrapper: visa direct list page over the shared `DemoKindListClient`.
 */

import { DemoKindListClient } from "@/components/shared/demo-kind-list-client";
import { visaDirectListConfig } from "@/components/shared/demo-kind-list-registry";
import type { StoredVisaDirectConfig } from "@/lib/types/dashboard";

interface VisaDirectClientProps {
  initialConfigs: StoredVisaDirectConfig[];
  orphanedConfigs: StoredVisaDirectConfig[];
  currentUserId?: string;
}

export function VisaDirectClient(props: VisaDirectClientProps) {
  return <DemoKindListClient config={visaDirectListConfig} {...props} />;
}
