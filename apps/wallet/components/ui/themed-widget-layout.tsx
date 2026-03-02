import { type ReactNode } from "react";
import { PoweredByFooter } from "@dynamic-demos/ui";
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
      className="min-h-screen flex flex-col items-center justify-center p-6 gap-4"
      style={{
        backgroundColor: config.theme?.pageBackground || DEFAULT_WIDGET_THEME.pageBackground,
        ...themeStyles,
      } as React.CSSProperties}
    >
      {/* Brand Logo */}
      {branding?.logo && (
        <img
          src={branding.logo}
          alt="Brand logo"
          className="h-12 object-contain mb-2"
        />
      )}

      {/* Main Content */}
      <div className="w-full max-w-[400px]" style={themeStyles as React.CSSProperties}>
        {children}
      </div>

      {/* Powered by Dynamic */}
      {showPoweredBy && <PoweredByFooter />}
    </div>
  );
}
