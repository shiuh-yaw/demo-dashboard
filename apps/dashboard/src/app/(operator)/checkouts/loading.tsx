/**
 * Route-loading fallback for the Checkouts list - mirrors `checkouts-client.tsx`'s
 * title row + config table so navigation isn't a blank screen while the
 * server component fetches.
 */

import { DemoListSkeleton } from "@/components/shared/loading-skeletons";

export default function CheckoutsLoading() {
  return <DemoListSkeleton title="Checkouts" />;
}
