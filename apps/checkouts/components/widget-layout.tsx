import { type ReactNode } from "react";
import { PoweredByFooter } from "@dynamic-demos/ui";
import PaymentPageLayout from "@/components/payment-page-layout";
import type { WidgetConfig } from "@/lib/widget-config";

interface WidgetLayoutProps {
  /** Widget configuration */
  config: WidgetConfig;
  /** Payment amount (required for payment mode) */
  paymentAmount?: number;
  /** Main content (the widget component) */
  children: ReactNode;
  /** Optional footer content (nav, overlays, etc.) */
  footer?: ReactNode;
  /** Additional CSS styles */
  style?: React.CSSProperties;
}

/**
 * Shared layout component for widget pages.
 *
 * Theme tokens (`--brand-*`) are injected at the document level by
 * `<ThemeStyleTag>` in `app/layout.tsx` (the unified pattern shared with
 * wallet, remittance, and visa-direct). This component is responsible for
 * the per-mode chrome: split-screen for payment, centered card for deposit.
 *
 * Background colors are sourced from `--brand-page-bg` / `--brand-surface`
 * — automatically picking up per-config overrides via the inline `<style>`
 * emitted by `<ThemeStyleTag overridesOnly>` in the root layout.
 */
export default function WidgetLayout({
  config,
  paymentAmount = 0,
  children,
  footer,
  style,
}: WidgetLayoutProps) {
  const branding = config.branding;
  const showPoweredBy = branding?.showPoweredBy !== false;

  // Payment mode - split screen layout
  if (config.mode === "payment") {
    return (
      <div style={style}>
        <PaymentPageLayout
          paymentAmount={paymentAmount}
          branding={branding}
          paymentPage={config.paymentPage}
        >
          <div className="w-full max-w-[385px]">{children}</div>
        </PaymentPageLayout>
        {footer}
      </div>
    );
  }

  // Deposit mode - centered layout
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 gap-2"
      style={{ backgroundColor: "var(--brand-page-bg)", ...style }}
    >
      {/* Brand Logo */}
      {branding?.logo && (
        <img
          src={branding.logo}
          alt={branding.name ?? "Brand logo"}
          className="h-12 object-contain mb-4"
        />
      )}

      {/* Main Content */}
      <div className="w-full max-w-[385px]">{children}</div>

      {/* Powered by Dynamic */}
      {showPoweredBy && <PoweredByFooter />}

      {/* Footer Content (nav, overlays, etc.) */}
      {footer}
    </div>
  );
}
