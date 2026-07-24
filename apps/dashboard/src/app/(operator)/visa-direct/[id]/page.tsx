/**
 * Edit Visa Direct Config Page. Thin wrapper over the unified DemoConfigEditor;
 * prospect-bound configs redirect to the one canonical in-context edit path.
 */

import { notFound, redirect } from "next/navigation";
import { getVisaDirectConfig } from "@/lib/actions/visa-direct";
import { DemoConfigEditor } from "@/components/shared/demo-config-editor";

interface EditVisaDirectConfigPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVisaDirectConfigPage({
  params,
}: EditVisaDirectConfigPageProps) {
  const { id } = await params;
  const result = await getVisaDirectConfig(id);

  if (!result.success || !result.data) {
    notFound();
  }

  if (result.data.prospectId) {
    redirect(`/dashboard/prospects/${result.data.prospectId}/demos/${id}`);
  }

  return <DemoConfigEditor kind="visa-direct" config={result.data} />;
}
