import { headers } from "next/headers";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";
import PaymentWidget from "@/components/payment-widget";
import WidgetLayout from "@/components/widget-layout";
import WidgetNav from "@/components/widget-nav";
import { CompletionScreen } from "@/components/payment-widget/screens/completion-screen";
import { PendingScreen } from "@/components/payment-widget/screens/pending-screen";
import { DEPOSIT_CONFIG, createWidgetConfig } from "@/lib/widget-config";
import { checkExistingTransaction } from "@/lib/api/checkouts";
import { parseTransactionParams } from "@/lib/url-params";
import { Status } from "@/lib/types";

/**
 * Checkout entry point.
 *
 * The middleware resolves the brand config id from `?theme=` or the
 * sticky `checkouts_config_id` cookie and forwards it as the
 * `x-checkouts-config-id` header. With no id — or with an id the
 * dashboard can no longer resolve — we render the unbranded demo so
 * stale `?theme=<id>` URLs still produce a working widget. With a
 * resolvable id we behave like the legacy `/w/[id]` page used to: parse
 * `externalId` / `metadata` query params, look up any existing
 * transaction, and route to the completion / pending / payment screen
 * accordingly.
 *
 * Legacy `/w/:id/...` URLs are handled via redirects in
 * `next.config.ts` — they rewrite to `/?theme=:id` (or
 * `/wallet?theme=:id`), preserving any query params, so embedded
 * customer apps don't need to change.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  const headersList = await headers();
  const configId = headersList.get("x-checkouts-config-id");
  const isOAuthRedirect = !!(
    query.dynamicOauthCode && query.dynamicOauthState
  );

  // Single fetch path: missing id, 404, or network error all resolve to
  // DEPOSIT_CONFIG. `createWidgetConfig` then deep-merges nested fields
  // (settlement, ui, theme) over the local DEFAULT_WIDGET_CONFIG so any
  // partial dashboard response still produces a complete config.
  const fetched = await fetchDemoConfig({
    demoType: "checkout",
    id: configId,
    fallback: DEPOSIT_CONFIG,
  });
  const config = createWidgetConfig(fetched);
  const paymentAmount = config.defaultPaymentAmount ?? 0;
  const showWidgetNav = config.depositDestination === "embedded";
  const transactionParams = parseTransactionParams(query);

  // Existing-transaction lookup requires a real checkout id; the
  // unbranded demo path uses a placeholder so the widget renders without
  // hitting the transactions endpoint.
  const widgetCheckoutId = configId ?? "demo-checkout-id";
  let existingTransaction = null;
  if (configId && transactionParams.externalId) {
    existingTransaction = await checkExistingTransaction(
      configId,
      transactionParams.externalId,
    );
  }

  let content;
  if (existingTransaction?.status === Status.CONFIRMED) {
    content = (
      <CompletionScreen
        transactionId={existingTransaction.id}
        explorerUrl={existingTransaction.explorerUrl}
        config={config}
        isTransitioning={false}
      />
    );
  } else if (existingTransaction?.status === Status.PENDING) {
    content = (
      <PendingScreen
        checkoutId={widgetCheckoutId}
        transactionId={existingTransaction.id}
        explorerUrl={existingTransaction.explorerUrl}
        config={config}
        isTransitioning={false}
      />
    );
  } else {
    content = (
      <PaymentWidget
        checkoutId={widgetCheckoutId}
        config={config}
        transaction={{ paymentAmount, ...transactionParams }}
        initialTransaction={existingTransaction}
        isOAuthRedirect={isOAuthRedirect}
      />
    );
  }

  return (
    <WidgetLayout
      config={config}
      paymentAmount={paymentAmount}
      footer={showWidgetNav && <WidgetNav />}
    >
      {content}
    </WidgetLayout>
  );
}
