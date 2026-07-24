/**
 * Route-loading fallback for the Visa Direct list - mirrors
 * `visa-direct-client.tsx`'s title row + config table so navigation isn't a
 * blank screen while the server component fetches.
 */

import { DemoListSkeleton } from "@/components/shared/loading-skeletons";

export default function VisaDirectLoading() {
  return <DemoListSkeleton title="Visa Direct" />;
}
