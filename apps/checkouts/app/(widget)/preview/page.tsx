"use client";

/**
 * Live Preview Page
 *
 * Receives widget config via postMessage for real-time preview updates.
 * Used by the dashboard editor to show instant preview changes.
 *
 * URL: /preview
 *
 * Communication protocol:
 * - Parent sends: { type: 'CONFIG_UPDATE', config: WidgetConfig }
 * - This page responds: { type: 'CONFIG_ACK' }
 */

import { useState, useEffect, useCallback } from "react";
import PaymentWidget from "@/components/payment-widget";
import WidgetLayout from "@/components/widget-layout";
import { type WidgetConfig, DEFAULT_WIDGET_CONFIG } from "@/lib/widget-config";

interface ConfigMessage {
  type: "CONFIG_UPDATE";
  config: WidgetConfig;
}

export default function PreviewPage() {
  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_WIDGET_CONFIG);
  const [isConnected, setIsConnected] = useState(false);
  const [isInIframe, setIsInIframe] = useState(true); // Assume iframe initially

  // Handle incoming messages from parent (dashboard)
  const handleMessage = useCallback((event: MessageEvent) => {
    // Validate message structure
    if (!event.data || typeof event.data !== "object") return;

    const message = event.data as ConfigMessage;

    if (message.type === "CONFIG_UPDATE" && message.config) {
      setConfig(message.config);
      setIsConnected(true);

      // Acknowledge receipt
      if (event.source && "postMessage" in event.source) {
        (event.source as Window).postMessage({ type: "CONFIG_ACK" }, "*");
      }
    }
  }, []);

  // Set up message listener and detect iframe
  useEffect(() => {
    // Check if we're in an iframe
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    // If not in iframe, skip waiting for messages
    if (!inIframe) {
      setIsConnected(true); // Show widget immediately
      return;
    }

    window.addEventListener("message", handleMessage);

    // Notify parent we're ready
    window.parent.postMessage({ type: "PREVIEW_READY" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const paymentAmount = config.defaultPaymentAmount;

  return (
    <WidgetLayout
      config={config}
      paymentAmount={paymentAmount}
      footer={!isConnected && isInIframe && <WaitingOverlay />}
    >
      <PaymentWidget
        checkoutId="preview-checkout-id"
        config={config}
        transaction={{ paymentAmount }}
      />
    </WidgetLayout>
  );
}

/**
 * Overlay shown while waiting for first config from dashboard
 */
function WaitingOverlay() {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Connecting...</p>
      </div>
    </div>
  );
}
