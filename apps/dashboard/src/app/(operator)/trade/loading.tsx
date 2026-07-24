/**
 * Route-loading fallback for the Trade list - mirrors `trade-client.tsx`'s
 * title row + config table so navigation isn't a blank screen while the
 * server component fetches.
 */

import { DemoListSkeleton } from "@/components/shared/loading-skeletons";

export default function TradeLoading() {
  return <DemoListSkeleton title="Trade" />;
}
