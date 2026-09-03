/**
 * Edit Rimau Config Page. Thin wrapper over the unified DemoConfigEditor;
 * prospect-bound configs redirect to the one canonical in-context edit path.
 */

import { notFound, redirect } from "next/navigation";
import { getRimauConfig } from "@/lib/actions/rimau";
import { DemoConfigEditor } from "@/components/shared/demo-config-editor";

interface EditRimauConfigPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRimauConfigPage({
  params,
}: EditRimauConfigPageProps) {
  const { id } = await params;
  const result = await getRimauConfig(id);

  if (!result.success || !result.data) {
    notFound();
  }

  if (result.data.prospectId) {
    redirect(`/dashboard/prospects/${result.data.prospectId}/demos/${id}`);
  }

  return <DemoConfigEditor kind="rimau" config={result.data} />;
}
