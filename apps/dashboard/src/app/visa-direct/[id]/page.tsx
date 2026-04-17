/**
 * Edit Visa Direct Config Page
 *
 * Page for editing an existing Visa Direct configuration.
 */

import { notFound } from "next/navigation";
import { getVisaDirectConfig } from "@/lib/actions/visa-direct";
import { VisaDirectConfigEditor } from "./visa-direct-config-editor";

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

  return <VisaDirectConfigEditor config={result.data} />;
}
