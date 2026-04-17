import { PoweredByFooter } from "@dynamic-demos/ui";

interface WidgetLayoutProps {
  children: React.ReactNode;
}

/**
 * Centered page layout for auth screens.
 * Server component — renders immediately without JavaScript.
 */
export function WidgetLayout({ children }: WidgetLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-(--widget-page-bg)">
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
      <div className="shrink-0 mt-auto">
        <PoweredByFooter />
      </div>
    </div>
  );
}
