import { WidgetCard, Spinner } from "@dynamic-demos/ui";
import { WidgetLayout } from "@/components/ui/widget-layout";

/**
 * Shown while login page loads. Matches LoginPage's initial spinner to avoid layout shift.
 */
export default function LoginLoading() {
  return (
    <WidgetLayout>
      <WidgetCard>
        <div className="flex items-center justify-center min-h-64">
          <Spinner size="lg" />
        </div>
      </WidgetCard>
    </WidgetLayout>
  );
}
