import { headers } from "next/headers";
import PaymentWidget from "@/components/payment-widget";
import WidgetLayout from "@/components/widget-layout";
import {
  type WidgetConfig,
  type TransactionConfig,
  DEPOSIT_CONFIG,
  createWidgetConfig,
} from "@/lib/widget-config";
import { getCheckoutConfig } from "@/lib/api/checkouts";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  const headersList = await headers();
  const configId = headersList.get("x-checkouts-config-id");

  // When a brand config is selected (via `?theme=`, sticky cookie, or
  // legacy `/w/[id]` path) the middleware forwards its id as
  // `x-checkouts-config-id`. Fetch the full WidgetConfig so the
  // merchant logo + name + settlement chain render correctly. The root
  // layout fetches the same id; Next.js dedupes the round-trip via the
  // `revalidate: 60` data cache. With no id we fall back to the
  // unbranded demo deposit config.
  const stored = configId ? await getCheckoutConfig(configId) : null;
  const config: WidgetConfig = stored
    ? createWidgetConfig(stored.config)
    : { ...DEPOSIT_CONFIG };

  const isOAuthRedirect = !!(query.dynamicOauthCode && query.dynamicOauthState);

  const transaction: TransactionConfig = {
    paymentAmount: config.defaultPaymentAmount ?? 19.0,
  };

  return (
    <WidgetLayout config={config} paymentAmount={transaction.paymentAmount}>
      <PaymentWidget
        checkoutId={configId ?? "demo-checkout-id"}
        config={config}
        transaction={transaction}
        isOAuthRedirect={isOAuthRedirect}
      />
    </WidgetLayout>
  );
}
