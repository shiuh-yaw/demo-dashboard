/**
 * Edit Brand Profile Page
 *
 * Page for editing an existing brand profile.
 */

import { notFound } from "next/navigation";
import { getBrandProfile } from "@/lib/actions/brands";
import { BrandEditor } from "./brand-editor";

interface EditBrandProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBrandProfilePage({
  params,
}: EditBrandProfilePageProps) {
  const { id } = await params;
  const result = await getBrandProfile(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <BrandEditor profile={result.data} />;
}
