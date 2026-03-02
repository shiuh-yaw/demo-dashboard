"use client";

import { formatUsd } from "@/lib/format";
import type { WidgetBranding, PaymentPageConfig } from "@/lib/widget-config";

interface PaymentPageLayoutProps {
  children: React.ReactNode;
  /** Payment amount in USD */
  paymentAmount: number;
  /** Brand configuration */
  branding?: WidgetBranding;
  /** Payment page specific configuration */
  paymentPage?: PaymentPageConfig;
}

/**
 * Split-screen payment page layout
 *
 * Left panel: Dark background with merchant info, amount, and product image
 * Right panel: Light background with the payment widget
 */
export default function PaymentPageLayout({
  children,
  paymentAmount,
  branding,
  paymentPage,
}: PaymentPageLayoutProps) {
  // Left panel styling
  const leftPanelStyle = {
    backgroundColor: paymentPage?.leftPanelBackground || "#151515",
    color: paymentPage?.leftPanelTextColor || "#ffffff",
  };

  // Right panel styling
  const rightPanelStyle = {
    backgroundColor: paymentPage?.rightPanelBackground || "#f8f8f8",
  };

  const mutedColor = paymentPage?.leftPanelMutedColor || "#8e8e8e";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Merchant Info */}
      <div
        className="flex-1 flex flex-col p-8 pt-6 lg:p-16 lg:pt-10 relative overflow-hidden"
        style={leftPanelStyle}
      >
        <div className="flex-1 flex flex-col justify-center items-center lg:items-start max-w-md mx-auto lg:mx-0 w-full">
          {/* Brand Logo */}
          {branding?.logo && (
            <div className="mb-16">
              <img
                src={branding.logo}
                alt={branding.name || "Brand logo"}
                className="h-10 object-contain"
              />
            </div>
          )}

          {/* Payment Details */}
          <div className="flex flex-col gap-2 mb-8 text-center lg:text-left">
            <p
              className="text-[22px] font-medium tracking-tight leading-tight"
              style={{ color: mutedColor }}
            >
              Pay {branding?.name || "Merchant"}
            </p>
            <p className="text-[42px] font-medium tracking-tight leading-tight">
              {formatUsd(paymentAmount)}
            </p>
          </div>

          {/* Product Image */}
          {paymentPage?.productImage && (
            <div className="relative rounded-lg overflow-hidden max-w-[372px] w-full aspect-372/339">
              <img
                src={paymentPage.productImage}
                alt="Product"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Widget */}
      <div
        className="flex-1 flex items-center justify-center p-6 lg:p-16"
        style={rightPanelStyle}
      >
        <div className="w-full max-w-[385px]">{children}</div>
      </div>
    </div>
  );
}
