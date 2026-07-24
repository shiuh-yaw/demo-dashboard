/**
 * Retired route. Prospect creation is now a modal on the overview toolbar, so
 * this path redirects to the single create surface.
 */

import { redirect } from "next/navigation";

export default function NewProspectRedirect() {
  redirect("/dashboard");
}
