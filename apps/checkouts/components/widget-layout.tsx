import { type ReactNode } from "react";
import { PoweredByFooter } from "@dynamic-demos/ui";
import PaymentPageLayout from "@/components/payment-page-layout";
import { type WidgetConfig, themeToCssVars } from "@/lib/widget-config";

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
 * Handles both payment (split-screen) and deposit (centered) layouts.
 */
export default function WidgetLayout({
  config,
  paymentAmount = 0,
  children,
  footer,
  style,
}: WidgetLayoutProps) {
  const themeStyles = themeToCssVars(config.theme ?? {});
  const branding = config.branding;
  const showPoweredBy = branding?.showPoweredBy !== false;

  // Payment mode - split screen layout
  if (config.mode === "payment") {
    return (
      <div style={{ ...themeStyles, ...style } as React.CSSProperties}>
        <PaymentPageLayout
          paymentAmount={paymentAmount}
          branding={branding}
          paymentPage={config.paymentPage}
        >
          <div className="w-full max-w-[385px]" style={themeStyles}>
            {children}
          </div>
        </PaymentPageLayout>
        {footer}
      </div>
    );
  }

  // Deposit mode - centered layout
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 gap-2"
      style={{
        backgroundColor: config.theme?.pageBackground || "#f6f8fa",
        ...themeStyles,
        ...style,
      }}
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
      <div className="w-full max-w-[385px]" style={themeStyles}>
        {children}
      </div>

      {/* Powered by Dynamic */}
      {showPoweredBy && <PoweredByFooter />}

      {/* Footer Content (nav, overlays, etc.) */}
      {footer}
    </div>
  );
}
