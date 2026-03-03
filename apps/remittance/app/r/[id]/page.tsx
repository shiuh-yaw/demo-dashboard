/**
 * Remittance Dashboard Index for /r/[id]
 *
 * Redirects to the main dashboard (overview).
 */

import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RemittanceIndexPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/r/${id}/dashboard`);
}
