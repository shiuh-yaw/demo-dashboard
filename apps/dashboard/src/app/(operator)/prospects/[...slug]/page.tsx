/**
 * Legacy deep-link path. Prospect detail/sub-routes now live under
 * `/dashboard/prospects`; this forwards old bookmarked or shared links
 * (e.g. `/prospects/{id}/demos/{configId}`) to the new location instead of
 * 404ing.
 */

import { redirect } from "next/navigation";

interface LegacyProspectSlugPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function LegacyProspectSlugRedirect({
  params,
}: LegacyProspectSlugPageProps) {
  const { slug } = await params;
  redirect(`/dashboard/prospects/${slug.join("/")}`);
}
