/**
 * Edit Remittance Config Page
 *
 * Page for editing an existing Remittance configuration.
 */

import { notFound } from "next/navigation";
import { getRemittanceConfig } from "@/lib/actions/remittance";
import { RemittanceConfigEditor } from "./remittance-config-editor";

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

  return <RemittanceConfigEditor config={result.data} />;
}
