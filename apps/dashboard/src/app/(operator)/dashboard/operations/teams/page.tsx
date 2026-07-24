/**
 * Legacy teams route - the teams/roles admin now lives at the Admin page
 * itself (`/dashboard/operations`); this only redirects stale links.
 */

import { redirect } from "next/navigation";

export default function TeamsAdminRedirect() {
  redirect("/dashboard/operations");
}
