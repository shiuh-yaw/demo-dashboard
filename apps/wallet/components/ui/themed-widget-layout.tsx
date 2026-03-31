import { type ReactNode } from "react";
import { DynamicLogo, PoweredByFooter } from "@dynamic-demos/ui";
import {
  type WidgetConfig,
  widgetThemeToCssVars,
  DEFAULT_WIDGET_THEME,
} from "@dynamic-demos/theme";

interface ThemedWidgetLayoutProps {
  /** Wallet configuration from dashboard API */
  config: WidgetConfig;
  /** Main content */
  children: ReactNode;
}

/**
 * Themed widget layout with config-driven styling
 *
 * Applies CSS custom properties from the wallet config theme,
 * renders branding elements, and handles the powered-by footer.
 */
export function ThemedWidgetLayout({
  config,
  children,
}: ThemedWidgetLayoutProps) {
  const themeStyles = widgetThemeToCssVars(config.theme ?? {});
  const branding = config.branding;
  const showPoweredBy = branding?.showPoweredBy !== false;

  return (
    <div
      className="min-h-screen flex flex-col items-center p-6"
      style={
        {
          backgroundColor:
            config.theme?.pageBackground || DEFAULT_WIDGET_THEME.pageBackground,
          ...themeStyles,
        } as React.CSSProperties
      }
    >
      {/* Centered content area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full">
        <div className="shrink-0 mb-2">
          {branding?.logo ? (
            <img
              src={branding.logo}
              alt="Brand logo"
              className="h-12 object-contain"
            />
          ) : (
            <DynamicLogo wordmark className="h-10 w-auto" />
          )}
        </div>
        <div
          className="w-full max-w-[400px]"
          style={themeStyles as React.CSSProperties}
        >
          {children}
        </div>
      </div>

      {/* Powered by Dynamic — fixed to bottom */}
      {showPoweredBy && (
        <div className="shrink-0 mt-auto">
          <PoweredByFooter />
        </div>
      )}
    </div>
  );
}
