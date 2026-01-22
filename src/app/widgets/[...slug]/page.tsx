/**
 * Widgets Catchall Redirect Route
 *
 * @deprecated Use /checkouts instead. This route is maintained for backwards compatibility.
 *
 * Redirects all /widgets/* routes to /checkouts/* for backwards compatibility.
 */

import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function WidgetsCatchallPage({ params }: PageProps) {
  const { slug } = await params;
  const path = slug && slug.length > 0 ? slug.join("/") : "";
  // Redirect to /checkouts if no path, otherwise /checkouts/{path}
  redirect(path ? `/checkouts/${path}` : "/checkouts");
}

