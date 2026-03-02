import { notFound } from "next/navigation";
import PaymentWidget from "@/components/payment-widget";
import WidgetLayout from "@/components/widget-layout";
import WidgetNav from "@/components/widget-nav";
import { CompletionScreen } from "@/components/payment-widget/screens/completion-screen";
import { PendingScreen } from "@/components/payment-widget/screens/pending-screen";
import {
  getCheckoutConfig,
  checkExistingTransaction,
} from "@/lib/api/checkouts";
import { parseTransactionParams } from "@/lib/url-params";
import { createWidgetConfig } from "@/lib/widget-config";
import { Status } from "@/lib/types";

/**
 * Checkout Widget Page
 *
 * Production checkout page for embedding.
 * URL: /w/[id]
 *
 * Supports URL parameters for transaction tracking:
 * - externalId: External system identifier for linking transactions
 * - metadata: JSON-encoded additional data (URL-encoded)
 *
 * Example: /w/abc123?externalId=order-456&metadata=%7B%22customerId%22%3A%22789%22%7D
 */
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  // Fetch config from dashboard API
  const storedConfig = await getCheckoutConfig(id);
  if (!storedConfig) notFound();

  const { config } = storedConfig;
  const paymentAmount = config.defaultPaymentAmount ?? 0;
  const showWidgetNav = config.depositDestination === "embedded";

  // Parse transaction params from URL (server-side for security)
  const transactionParams = parseTransactionParams(query);

  // Check for existing transaction if externalId is provided
  // This happens server-side alongside fetching the checkout config
  let existingTransaction = null;
  if (transactionParams.externalId) {
    existingTransaction = await checkExistingTransaction(
      id,
      transactionParams.externalId,
    );
  }

  // Detect OAuth redirect (exchange connection returning from provider)
  // This is checked server-side so the initial render shows the correct screen
  // without a flash of the deposit-amount screen.
  const isOAuthRedirect = !!(query.dynamicOauthCode && query.dynamicOauthState);

  // If we have a confirmed or pending transaction, render appropriate screen directly
  const widgetConfig = createWidgetConfig(config);

  // Determine which screen to render based on transaction status
  let content;
  if (existingTransaction?.status === Status.CONFIRMED) {
    content = (
      <CompletionScreen
        transactionId={existingTransaction.id}
        explorerUrl={existingTransaction.explorerUrl}
        config={widgetConfig}
        isTransitioning={false}
      />
    );
  } else if (existingTransaction?.status === Status.PENDING) {
    content = (
      <PendingScreen
        checkoutId={id}
        transactionId={existingTransaction.id}
        explorerUrl={existingTransaction.explorerUrl}
        config={widgetConfig}
        isTransitioning={false}
      />
    );
  } else {
    content = (
      <PaymentWidget
        checkoutId={id}
        config={config}
        transaction={{
          paymentAmount,
          ...transactionParams,
        }}
        initialTransaction={existingTransaction}
        isOAuthRedirect={isOAuthRedirect}
      />
    );
  }

  return (
    <WidgetLayout
      config={config}
      paymentAmount={paymentAmount}
      footer={showWidgetNav && <WidgetNav widgetId={id} />}
    >
      {content}
    </WidgetLayout>
  );
}
