/**
 * Pure formatting helpers for viewer/contact rows - shared between the
 * per-prospect Contacts tab (`prospects/[id]/prospect-contacts.tsx`) and the
 * org-wide Contacts workspace view (`dashboard/contacts/`), so date/duration/
 * milestone/company formatting never drifts between the two. No
 * React/Next/droplet imports here - keeps this module testable in a plain
 * node environment, unlike the client components that consume it.
 */

import type { ContactView, VisitorSessionView } from "@/lib/services";

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Whole seconds/minutes only - never sub-second precision (not useful). */
export function formatDuration(startedAt: string, lastSeenAt: string): string {
  const ms = new Date(lastSeenAt).getTime() - new Date(startedAt).getTime();
  const totalSec = Math.max(0, Math.round(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec === 0 ? `${min}m` : `${min}m ${sec}s`;
}

/** Most recent milestone reached, first-seen order means the last entry is
 * the furthest the session got. Falls back to "Viewed" for pageview-only
 * sessions with no milestone events. */
export function milestoneLabel(session: VisitorSessionView): string {
  const last = session.milestones[session.milestones.length - 1];
  if (!last) return "Viewed";
  return last
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function companyLabel(contact: ContactView): string {
  return contact.company?.name ?? contact.company?.domain ?? "Unknown company";
}
