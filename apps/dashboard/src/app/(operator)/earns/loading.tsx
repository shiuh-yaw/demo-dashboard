/**
 * Route-loading fallback for the Earn list - mirrors `earns-client.tsx`'s
 * title row + config table so navigation isn't a blank screen while the
 * server component fetches.
 */

import { DemoListSkeleton } from "@/components/shared/loading-skeletons";

export default function EarnsLoading() {
  return <DemoListSkeleton title="Earn" />;
}
