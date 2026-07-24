/**
 * Settings tab loading fallback - a settings-form skeleton, not the Overview
 * chart layout the parent segment's loading.tsx would otherwise cascade.
 */

import { SettingsSkeleton } from "@/components/shared/loading-skeletons";

export default function SettingsLoading() {
  return <SettingsSkeleton sections={4} />;
}
