/**
 * Contact detail - one person, everything known about them.
 *
 * The Contacts list answers "who has been here"; this answers "what did THIS
 * person do". Company profile (linking through to the prospect when one exists
 * and the operator may see it), per-demo engagement, then the raw sessions.
 *
 * Scope is re-resolved server-side: `getContactDetail` returns null for a key
 * outside the caller's scope exactly as it does for one that does not exist, so
 * a guessed key cannot confirm a contact exists elsewhere.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

import {
  getSessionUser,
  resolveActiveScope,
  resolveAnalyticsReadScope,
  visibleProspectIds,
  isProspectVisible,
} from "@/lib/auth/gtm";
import { canCreateRecord } from "@/lib/auth/policy";
import { services } from "@/lib/services";
import { MAX_PAGE_LIMIT } from "@/lib/services/postgres/pagination";
import { ContactDetailView } from "./contact-detail-view";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  // Emails carry "@" and "." - the route segment is encoded by the linker.
  const contactKey = decodeURIComponent(key);

  const user = await getSessionUser();
  if (!user) notFound();

  const scope = await resolveActiveScope(user);
  const readScope = await resolveAnalyticsReadScope(user, scope);
  const detail = await services.analytics.getContactDetail(contactKey, readScope);
  if (!detail) notFound();

  // Resolve prospect names, and only link the ones this operator may open -
  // being able to SEE a contact does not imply access to its prospect.
  const visible = await visibleProspectIds(user);
  const prospects =
    detail.contact.prospectIds.length > 0
      ? (
          await services.prospects.list({
            where: { id: { in: detail.contact.prospectIds } },
            limit: MAX_PAGE_LIMIT,
          })
        ).items.map((p) => ({
          id: p.id,
          name: p.name,
          linkable: isProspectVisible(visible, p.id),
        }))
      : [];

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/contacts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Contacts
      </Link>

      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-foreground">
            {detail.contact.email ?? "Unknown User"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {detail.contact.company?.name ?? "No company resolved"}
          </p>
        </div>
      </div>

      <ContactDetailView
        detail={detail}
        prospects={prospects}
        canCreateProspect={canCreateRecord(user)}
      />
    </div>
  );
}
