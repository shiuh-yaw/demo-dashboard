/**
 * Widget Preview Component
 *
 * Displays a live preview of the widget configuration via iframe.
 * Uses postMessage to send real-time config updates to the widget project.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink, RefreshCw, Radio } from "lucide-react";
import { Tooltip } from "@dynamic-demos/ui";
import type { WidgetConfig } from "@/lib/widget-config";
import { demoThemeUrl, launchBaseUrl } from "@/lib/share-links/launch-url";

interface WidgetPreviewProps {
  config: WidgetConfig;
  /** Widget ID for saved widget links */
  widgetId?: string;
}

export function WidgetPreview({ config, widgetId }: WidgetPreviewProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Live preview URL
  const livePreviewUrl = `${launchBaseUrl("checkout")}/preview`;
  // Saved widget URL (for "open in new tab")
  const savedWidgetUrl = widgetId ? demoThemeUrl("checkout", widgetId) : null;

  // Send config to iframe via postMessage
  const sendConfigToIframe = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "CONFIG_UPDATE", config },
        "*"
      );
    }
  }, [config]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PREVIEW_READY") {
        setIsConnected(true);
        sendConfigToIframe();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sendConfigToIframe]);

  // Send config updates when config changes
  useEffect(() => {
    if (isConnected) {
      sendConfigToIframe();
    }
  }, [config, isConnected, sendConfigToIframe]);

  // Re-send config when iframe loads
  const handleIframeLoad = () => {
    setTimeout(sendConfigToIframe, 100);
  };

  const refreshIframe = () => {
    setIsConnected(false);
    setIframeKey((k) => k + 1);
  };

  return (
    <div className="flex-1 sticky top-8 h-fit">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-[#99a0ae] uppercase tracking-[0.48px]">
            Preview
          </span>
          {/* Connection status */}
          <span
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${
              isConnected
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            <Radio
              className={`w-2.5 h-2.5 ${
                isConnected ? "text-green-500" : "text-yellow-500 animate-pulse"
              }`}
            />
            {isConnected ? "Live" : "Connecting..."}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Refresh button */}
          <Tooltip content="Refresh preview" position="top">
            <button
              onClick={refreshIframe}
              className="p-1.5 text-[#99a0ae] hover:text-[#0e121b] rounded-md transition-colors"
              aria-label="Refresh preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          {/* Open saved widget in new tab */}
          {savedWidgetUrl && (
            <Tooltip content="Open saved widget in new tab" position="top">
              <a
                href={savedWidgetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-[#99a0ae] hover:text-[#0e121b] rounded-md transition-colors"
                aria-label="Open saved widget in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Preview container */}
      <div
        className="rounded-xl overflow-hidden border border-[#e1e4ea] bg-white"
        style={{ minHeight: "450px" }}
      >
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={livePreviewUrl}
          onLoad={handleIframeLoad}
          className="w-full h-[500px] border-0"
          title="Live Widget Preview"
        />
      </div>
    </div>
  );
}
