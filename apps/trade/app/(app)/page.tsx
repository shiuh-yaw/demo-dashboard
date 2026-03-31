/**
 * App Index
 *
 * Redirects to the default tab (portfolio).
 */

import { redirect } from "next/navigation";

export default function AppIndexPage() {
  redirect("/portfolio");
}
