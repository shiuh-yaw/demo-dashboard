import { Spinner } from "@dynamic-demos/ui";

/**
 * Shown while app pages (overview, history, settings) load.
 * Keeps the shell visible and shows a minimal loading state for content area.
 */
export default function AppLoading() {
  return (
    <div className="flex items-center justify-center min-h-64">
      <Spinner size="lg" />
    </div>
  );
}
