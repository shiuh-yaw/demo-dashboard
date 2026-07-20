/**
 * Edit Prospect Profile Page
 *
 * Page for editing an existing prospect profile.
 */

import { notFound } from "next/navigation";
import { getProspectProfile } from "@/lib/actions/prospects";
import { ProspectEditor } from "./prospect-editor";

interface EditProspectProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProspectProfilePage({
  params,
}: EditProspectProfilePageProps) {
  const { id } = await params;
  const result = await getProspectProfile(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <ProspectEditor profile={result.data} />;
}
