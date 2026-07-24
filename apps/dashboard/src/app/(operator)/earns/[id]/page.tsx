/**
 * Edit Earn Config Page. Thin wrapper over the unified DemoConfigEditor;
 * prospect-bound configs redirect to the one canonical in-context edit path.
 */

import { notFound, redirect } from "next/navigation";
import { getEarnConfig } from "@/lib/actions/earns";
import { DemoConfigEditor } from "@/components/shared/demo-config-editor";

interface EditEarnConfigPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEarnConfigPage({
  params,
}: EditEarnConfigPageProps) {
  const { id } = await params;
  const result = await getEarnConfig(id);

  if (!result.success || !result.data) {
    notFound();
  }

  if (result.data.prospectId) {
    redirect(`/dashboard/prospects/${result.data.prospectId}/demos/${id}`);
  }

  return <DemoConfigEditor kind="earn" config={result.data} />;
}
