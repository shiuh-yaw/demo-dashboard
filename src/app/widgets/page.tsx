/**
 * Widgets Dashboard Page (Server Component)
 *
 * @deprecated Use /checkouts instead. This route is maintained for backwards compatibility.
 *
 * Redirects to the new checkouts page.
 */

import { redirect } from "next/navigation";

export default function WidgetsPage() {
  redirect("/checkouts");
}
