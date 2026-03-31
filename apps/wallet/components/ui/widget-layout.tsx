import { DynamicLogo, PoweredByFooter } from "@dynamic-demos/ui";

interface WidgetLayoutProps {
  children: React.ReactNode;
}

/**
 * Centered page layout for the widget
 * Server component - renders immediately without JavaScript
 */
export function WidgetLayout({ children }: WidgetLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-(--widget-page-bg)">
      <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full">
        <div className="shrink-0 mb-2">
          <DynamicLogo wordmark className="h-10 w-auto" />
        </div>
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
      <div className="shrink-0 mt-auto">
        <PoweredByFooter />
      </div>
    </div>
  );
}
