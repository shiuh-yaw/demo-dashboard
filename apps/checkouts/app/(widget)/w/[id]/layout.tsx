/**
 * Checkouts Config Layout — thin wrapper for path-based routes.
 *
 * The middleware extracts `[id]` from `/w/<id>/...` and forwards it as
 * `x-checkouts-config-id`. The root `app/layout.tsx` reads that header,
 * fetches the config once, injects the theme via `<ThemeStyleTag>`, and
 * wraps the body in `<CheckoutsConfigProvider>`.
 *
 * This nested layout therefore only validates that the id exists
 * (`notFound()` if not) and contributes per-brand `<title>` metadata.
 * The fetch goes through `getCheckoutConfig`, which is wrapped in React
 * `cache()` upstream — so this validation call dedupes with the root
 * layout's fetch and `generateMetadata`'s fetch in the same render.
 */

import { notFound } from "next/navigation";
import { getCheckoutConfig } from "@/lib/api/checkouts";

interface CheckoutsConfigLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stored = await getCheckoutConfig(id);
  if (!stored) return { title: "Checkout Not Found" };
  const title = stored.name || "Payment Widget";
  return { title };
}

export default async function CheckoutsConfigLayout({
  children,
  params,
}: CheckoutsConfigLayoutProps) {
  const { id } = await params;
  const stored = await getCheckoutConfig(id);
  if (!stored) notFound();
  return <>{children}</>;
}
