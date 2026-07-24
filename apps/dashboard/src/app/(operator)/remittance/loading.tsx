/**
 * Route-loading fallback for the Remittance list - mirrors
 * `remittance-client.tsx`'s title row + config table so navigation isn't a
 * blank screen while the server component fetches.
 */

import { DemoListSkeleton } from "@/components/shared/loading-skeletons";

export default function RemittanceLoading() {
  return <DemoListSkeleton title="Remittance" />;
}
