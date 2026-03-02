/**
 * Dashboard Index Page for /e/[id]
 *
 * Redirects to the Earn page.
 */

import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardIndexPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/e/${id}/earn`);
}
