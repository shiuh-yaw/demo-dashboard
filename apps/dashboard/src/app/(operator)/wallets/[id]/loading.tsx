/**
 * Route-loading fallback for the Wallet config editor - mirrors the standalone
 * `DemoConfigEditor` shell (header + Basic Info/Appearance/kind-fields cards).
 */

import { DemoEditorSkeleton } from "@/components/shared/loading-skeletons";

export default function EditWalletConfigLoading() {
  return <DemoEditorSkeleton />;
}
