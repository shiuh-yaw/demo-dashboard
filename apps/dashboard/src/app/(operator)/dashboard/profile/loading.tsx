/**
 * Profile loading fallback - a settings-form skeleton, not the dashboard
 * Overview layout the parent segment's loading.tsx would otherwise cascade.
 */

import {
  PageHeaderSkeleton,
  SettingsSkeleton,
} from "@/components/shared/loading-skeletons";

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <SettingsSkeleton sections={3} />
    </div>
  );
}
