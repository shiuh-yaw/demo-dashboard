/**
 * Edit Trade Config Page. Thin wrapper over the unified DemoConfigEditor;
 * prospect-bound configs redirect to the one canonical in-context edit path.
 */

import { notFound, redirect } from "next/navigation";
import { getTradeConfig } from "@/lib/actions/trade";
import { DemoConfigEditor } from "@/components/shared/demo-config-editor";

interface EditTradeConfigPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTradeConfigPage({
  params,
}: EditTradeConfigPageProps) {
  const { id } = await params;
  const result = await getTradeConfig(id);

  if (!result.success || !result.data) {
    notFound();
  }

  if (result.data.prospectId) {
    redirect(`/dashboard/prospects/${result.data.prospectId}/demos/${id}`);
  }

  return <DemoConfigEditor kind="trade" config={result.data} />;
}
