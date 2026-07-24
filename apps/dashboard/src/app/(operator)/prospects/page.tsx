/**
 * Legacy path. Prospects now live under `/dashboard/prospects`; this keeps
 * old bookmarks and out-of-repo links resolving instead of 404ing.
 */

import { redirect } from "next/navigation";

export default function LegacyProspectsRedirect() {
  redirect("/dashboard");
}
