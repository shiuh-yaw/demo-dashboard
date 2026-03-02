import PaymentWidget from "@/components/payment-widget";
import WidgetLayout from "@/components/widget-layout";
import {
  type WidgetConfig,
  type WidgetMode,
  type TransactionConfig,
  DEPOSIT_CONFIG,
  PAYMENT_CONFIG,
} from "@/lib/widget-config";

/**
 * Server-side config fetch simulation.
 * In production, this would fetch from your API:
 *   const config = await fetch('/api/widget-config').then(r => r.json());
 */
async function getWidgetConfig(mode: WidgetMode): Promise<WidgetConfig> {
  const baseConfig = mode === "deposit" ? DEPOSIT_CONFIG : PAYMENT_CONFIG;

  // Apply appropriate theme based on mode
  // Payment mode uses light theme to match Figma design
  return {
    ...baseConfig,
    // theme: mode === "payment" ? lightTheme : darkTheme,
    // branding: customBranding,
    // paymentPage: mode === "payment" ? customPaymentPage : undefined,
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;

  // Change to "payment" for fixed amount mode
  const config = await getWidgetConfig("deposit");

  // Detect OAuth redirect (exchange connection returning from provider)
  const isOAuthRedirect = !!(query.dynamicOauthCode && query.dynamicOauthState);

  // Per-transaction values - in a real app, these would come from your checkout flow
  const transaction: TransactionConfig = {
    // Payment amount for this specific order (payment mode only)
    paymentAmount: 19.0,
  };

  return (
    <WidgetLayout config={config} paymentAmount={transaction.paymentAmount}>
      <PaymentWidget
        checkoutId="demo-checkout-id"
        config={config}
        transaction={transaction}
        isOAuthRedirect={isOAuthRedirect}
      />
    </WidgetLayout>
  );
}
