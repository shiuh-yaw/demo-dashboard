import { headers } from "next/headers";
import { notFound } from "next/navigation";
import PaymentWidget from "@/components/payment-widget";
import WidgetLayout from "@/components/widget-layout";
import WidgetNav from "@/components/widget-nav";
import { CompletionScreen } from "@/components/payment-widget/screens/completion-screen";
import { PendingScreen } from "@/components/payment-widget/screens/pending-screen";
import {
  type TransactionConfig,
  DEPOSIT_CONFIG,
  createWidgetConfig,
} from "@/lib/widget-config";
import {
  getCheckoutConfig,
  checkExistingTransaction,
} from "@/lib/api/checkouts";
import { parseTransactionParams } from "@/lib/url-params";
import { Status } from "@/lib/types";

/**
 * Checkout entry point.
 *
 * The middleware resolves the brand config id from `?theme=` or the
 * sticky `checkouts_config_id` cookie and forwards it as the
 * `x-checkouts-config-id` header. With no id we render the unbranded
 * demo. With a valid id we behave like the legacy `/w/[id]` page used
 * to: parse `externalId` / `metadata` query params, look up any
 * existing transaction, and route to the completion / pending /
 * payment screen accordingly.
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

  if (!configId) {
    const transaction: TransactionConfig = { paymentAmount: 19.0 };
    return (
      <WidgetLayout
        config={DEPOSIT_CONFIG}
        paymentAmount={transaction.paymentAmount}
      >
        <PaymentWidget
          checkoutId="demo-checkout-id"
          config={DEPOSIT_CONFIG}
          transaction={transaction}
          isOAuthRedirect={isOAuthRedirect}
        />
      </WidgetLayout>
    );
  }

  const stored = await getCheckoutConfig(configId);
  if (!stored) notFound();

  const config = createWidgetConfig(stored.config);
  const paymentAmount = config.defaultPaymentAmount ?? 0;
  const showWidgetNav = config.depositDestination === "embedded";
  const transactionParams = parseTransactionParams(query);

  let existingTransaction = null;
  if (transactionParams.externalId) {
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
        checkoutId={configId}
        transactionId={existingTransaction.id}
        explorerUrl={existingTransaction.explorerUrl}
        config={config}
        isTransitioning={false}
      />
    );
  } else {
    content = (
      <PaymentWidget
        checkoutId={configId}
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
