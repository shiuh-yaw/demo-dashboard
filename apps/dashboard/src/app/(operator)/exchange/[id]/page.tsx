/**
 * Edit Exchange Config Page. Thin wrapper over the unified DemoConfigEditor;
 * prospect-bound configs redirect to the one canonical in-context edit path.
 */

import { notFound, redirect } from "next/navigation";
import { getExchangeConfig } from "@/lib/actions/exchange";
import { DemoConfigEditor } from "@/components/shared/demo-config-editor";

interface EditExchangeConfigPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExchangeConfigPage({
  params,
}: EditExchangeConfigPageProps) {
  const { id } = await params;
  const result = await getExchangeConfig(id);

  if (!result.success || !result.data) {
    notFound();
  }

  if (result.data.prospectId) {
    redirect(`/dashboard/prospects/${result.data.prospectId}/demos/${id}`);
  }

  return <DemoConfigEditor kind="exchange" config={result.data} />;
}
