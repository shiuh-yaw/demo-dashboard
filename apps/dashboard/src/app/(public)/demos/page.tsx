import { redirect } from "next/navigation";

/**
 * /demos has no index of its own — the landing page at / is the demo grid.
 * Redirect instead of 404 so trimmed detail-page URLs land somewhere useful.
 */
export default function DemosIndexPage() {
  redirect("/");
}
