/**
 * Edit Earn Config Page
 *
 * Page for editing an existing Earn configuration.
 */

import { notFound } from "next/navigation";
import { getEarnConfig } from "@/lib/actions/earns";
import { EarnConfigEditor } from "./earn-config-editor";

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

  return <EarnConfigEditor config={result.data} />;
}
