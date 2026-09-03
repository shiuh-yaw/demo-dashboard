/**
 * Prospect hub - single demo instance. Metrics-first: engagement metric
 * cards, a momentum chart, an engagement funnel, and a "who viewed this
 * demo" sessions drill-down sit above the theme-override editor
 * (DemoConfigEditor in its "prospect-instance" variant). Externally-managed
 * kinds (checkout) redirect to their own console.
 */

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { services } from "@/lib/services";
import { getSessionUser, visibleProspectIds } from "@/lib/auth/gtm";
import { getWalletConfig } from "@/lib/actions/wallets";
import { getEarnConfig } from "@/lib/actions/earns";
import { getRemittanceConfig } from "@/lib/actions/remittance";
import { getTradeConfig } from "@/lib/actions/trade";
import { getRimauConfig } from "@/lib/actions/rimau";
import { getVisaDirectConfig } from "@/lib/actions/visa-direct";
import { getProspectProfile } from "@/lib/actions/prospects";
import { SetBreadcrumbLeaf } from "@/components/breadcrumbs";
import { DemoConfigEditor } from "@/components/shared/demo-config-editor";
import { DemoInstanceHeader } from "@/components/shared/demo-instance-header";
import { demoThemeUrl } from "@/lib/share-links/launch-url";
import { type StoredDemoConfig } from "@/components/shared/demo-editor-registry";
import {
  EXTERNAL_CONSOLE_HREF,
  DASHBOARD_EDITABLE_KINDS,
} from "@/components/shared/demo-editor-metadata";
import type { DemoConfigKind } from "@/lib/services/types";
import {
  ChartCardSkeleton,
  FunnelCardSkeleton,
  MetricCardsSkeleton,
  TableCardSkeleton,
} from "@/components/shared/loading-skeletons";
import {
  DemoInstanceAnalytics,
  DEFAULT_DEMO_INSTANCE_RANGE,
} from "./demo-instance-analytics";
import { DemoInstanceSessions } from "./demo-instance-sessions";

interface ProspectDemoInstancePageProps {
  params: Promise<{ id: string; configId: string }>;
}

async function loadStored(
  kind: DemoConfigKind,
  id: string,
): Promise<StoredDemoConfig | null> {
  switch (kind) {
    case "wallet": {
      const r = await getWalletConfig(id);
      return r.success ? r.data : null;
    }
    case "earn": {
      const r = await getEarnConfig(id);
      return r.success ? r.data : null;
    }
    case "remittance": {
      const r = await getRemittanceConfig(id);
      return r.success ? r.data : null;
    }
    case "trade": {
      const r = await getTradeConfig(id);
      return r.success ? r.data : null;
    }
    case "visa-direct": {
      const r = await getVisaDirectConfig(id);
      return r.success ? r.data : null;
    }
    case "rimau": {
      const r = await getRimauConfig(id);
      return r.success ? r.data : null;
    }
    default:
      return null;
  }
}

export default async function ProspectDemoInstancePage({
  params,
}: ProspectDemoInstancePageProps) {
  const { id, configId } = await params;

  const record = await services.demoConfigs.get(configId);
  if (!record || record.prospectId !== id) {
    notFound();
  }

  // Kinds edited in their own console (checkout) leave the dashboard.
  const externalHref = EXTERNAL_CONSOLE_HREF[record.kind];
  if (externalHref) {
    redirect(externalHref(configId));
  }

  const backHref = `/dashboard/prospects/${id}/demos`;
  const profileResult = await getProspectProfile(id);
  const profile = profileResult.success ? profileResult.data : null;
  const instanceShare = profile
    ? { id, name: profile.name, domain: profile.companyUrl ?? null }
    : undefined;
  const insights = (
    <Suspense fallback={<DemoInstanceInsightsSkeleton />}>
      <DemoInstanceInsights prospectId={id} configId={configId} />
    </Suspense>
  );

  // Kinds with no in-dashboard editor (flow - its theme comes from the
  // prospect) still get the shared instance page: metrics, sessions, share,
  // just without a Theme editor.
  if (!DASHBOARD_EDITABLE_KINDS.has(record.kind)) {
    const demoName = record.name ?? "Demo";
    return (
      <>
        <SetBreadcrumbLeaf label={demoName} />
        <DemoInstanceHeader
          name={demoName}
          backHref={backHref}
          demoUrl={demoThemeUrl(record.kind, configId) || null}
          demoConfigId={configId}
          instanceShare={instanceShare}
        />
        <div className="space-y-8">{insights}</div>
      </>
    );
  }

  const stored = await loadStored(record.kind, configId);
  if (!stored) {
    notFound();
  }

  return (
    <>
      <SetBreadcrumbLeaf label={stored.name} />
      <DemoConfigEditor
        kind={record.kind}
        config={stored}
        backHref={backHref}
        showProspectPicker={false}
        variant="prospect-instance"
        instanceShare={instanceShare}
      >
        {insights}
      </DemoConfigEditor>
    </>
  );
}

/**
 * Analytics + sessions for this demo instance, streamed under the parent
 * Suspense boundary so the editor shell above paints first. Read scope is
 * the caller's prospect visibility, re-derived server-side here - fails
 * closed (empty scope) when unauthenticated, exactly as the page did inline
 * before this was split out.
 */
async function DemoInstanceInsights({
  prospectId,
  configId,
}: {
  prospectId: string;
  configId: string;
}) {
  const user = await getSessionUser();
  const scope = user ? await visibleProspectIds(user) : new Set<string>();

  const [summary, momentum, funnelStages, sessions] = await Promise.all([
    services.analytics.demoSummary(configId),
    services.analytics.demoKindTimeseries(
      [configId],
      scope,
      DEFAULT_DEMO_INSTANCE_RANGE,
    ),
    services.analytics.demoKindFunnel([configId], scope),
    services.analytics.listProspectSessions(prospectId, scope, {
      demoConfigId: configId,
    }),
  ]);

  return (
    <>
      <DemoInstanceAnalytics
        configId={configId}
        sessions={summary.sessions}
        viewers={summary.viewers}
        avgDurationSec={summary.avgDurationSec}
        lastViewedAt={summary.lastViewedAt}
        initialMomentum={momentum}
        funnelStages={funnelStages}
      />
      <DemoInstanceSessions sessions={sessions} />
    </>
  );
}

/** Suspense fallback for `DemoInstanceInsights` - mirrors its metric cards + momentum/funnel + sessions table shape. */
function DemoInstanceInsightsSkeleton() {
  return (
    <div className="space-y-8">
      <MetricCardsSkeleton />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ChartCardSkeleton />
        <FunnelCardSkeleton />
      </div>
      <TableCardSkeleton rows={4} />
    </div>
  );
}
