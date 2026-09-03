/**
 * Route-loading fallback for the Exchange list - mirrors `exchange-client.tsx`'s
 * title row + config table so navigation isn't a blank screen while the
 * server component fetches.
 */

import { DemoListSkeleton } from "@/components/shared/loading-skeletons";

export default function ExchangeLoading() {
  return <DemoListSkeleton title="Exchange" />;
}
