/**
 * Route-loading fallback for the Rimau list - mirrors `rimau-client.tsx`'s
 * title row + config table so navigation isn't a blank screen while the
 * server component fetches.
 */

import { DemoListSkeleton } from "@/components/shared/loading-skeletons";

export default function RimauLoading() {
  return <DemoListSkeleton title="Rimau" />;
}
