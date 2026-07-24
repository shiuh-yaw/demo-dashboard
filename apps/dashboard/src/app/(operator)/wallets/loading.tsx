/**
 * Route-loading fallback for the Wallets list - mirrors `wallets-client.tsx`'s
 * title row + config table so navigation isn't a blank screen while the
 * server component fetches.
 */

import { DemoListSkeleton } from "@/components/shared/loading-skeletons";

export default function WalletsLoading() {
  return <DemoListSkeleton title="Wallets" />;
}
