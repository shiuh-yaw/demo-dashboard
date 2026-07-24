/**
 * Edit Wallet Config Page. Thin wrapper over the unified DemoConfigEditor;
 * prospect-bound configs redirect to the one canonical in-context edit path.
 */

import { notFound, redirect } from "next/navigation";
import { getWalletConfig } from "@/lib/actions/wallets";
import { DemoConfigEditor } from "@/components/shared/demo-config-editor";

interface EditWalletConfigPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWalletConfigPage({
  params,
}: EditWalletConfigPageProps) {
  const { id } = await params;
  const result = await getWalletConfig(id);

  if (!result.success || !result.data) {
    notFound();
  }

  if (result.data.prospectId) {
    redirect(`/dashboard/prospects/${result.data.prospectId}/demos/${id}`);
  }

  return <DemoConfigEditor kind="wallet" config={result.data} />;
}
