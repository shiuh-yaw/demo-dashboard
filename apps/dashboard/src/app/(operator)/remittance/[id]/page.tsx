/**
 * Edit Remittance Config Page. Thin wrapper over the unified DemoConfigEditor;
 * prospect-bound configs redirect to the one canonical in-context edit path.
 */

import { notFound, redirect } from "next/navigation";
import { getRemittanceConfig } from "@/lib/actions/remittance";
import { DemoConfigEditor } from "@/components/shared/demo-config-editor";

interface EditRemittanceConfigPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRemittanceConfigPage({
  params,
}: EditRemittanceConfigPageProps) {
  const { id } = await params;
  const result = await getRemittanceConfig(id);

  if (!result.success || !result.data) {
    notFound();
  }

  if (result.data.prospectId) {
    redirect(`/dashboard/prospects/${result.data.prospectId}/demos/${id}`);
  }

  return <DemoConfigEditor kind="remittance" config={result.data} />;
}
