/**
 * Pure formatting helpers for the demo-instance "Who viewed this demo"
 * sessions list. No React/Next/droplet imports - keeps this module testable
 * in a plain node environment, unlike the client component that consumes it.
 */

import type { ContactCompany, VisitorSessionView } from "@/lib/services";

/** Row primary label: company name, else domain, else "Unknown company". */
export function sessionCompanyLabel(session: VisitorSessionView): string {
  return session.company?.name ?? session.company?.domain ?? "Unknown company";
}

/** Title-cases one milestone key, splitting on hyphens and underscores. */
export function formatMilestoneChip(milestone: string): string {
  return milestone
    .split(/[-_]/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** One unique viewer (key = email, else anonId) with their sessions grouped. */
export interface ViewerGroup {
  key: string;
  email: string | null;
  company: ContactCompany | null;
  sessionCount: number;
  /** Most recent activity across the viewer's sessions. */
  lastSeenAt: string;
  /** This viewer's sessions, newest (by lastSeenAt) first. */
  sessions: VisitorSessionView[];
}

/**
 * Groups sessions by viewer (email when captured, else the anonymous id) so
 * a returning viewer shows one row instead of one row per session. Groups
 * are ordered newest-viewer-first by last activity; each group's sessions
 * are newest first too, so `sessions[0]` is always the latest one.
 */
export function groupSessionsByViewer(
  sessions: VisitorSessionView[],
): ViewerGroup[] {
  const byKey = new Map<string, VisitorSessionView[]>();
  for (const session of sessions) {
    const key = session.email ?? session.anonId;
    const existing = byKey.get(key);
    if (existing) {
      existing.push(session);
    } else {
      byKey.set(key, [session]);
    }
  }

  const groups: ViewerGroup[] = [];
  for (const [key, viewerSessions] of byKey) {
    const sorted = [...viewerSessions].sort(
      (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
    );
    const latest = sorted[0];
    groups.push({
      key,
      email: latest.email,
      company: sorted.find((s) => s.company)?.company ?? null,
      sessionCount: sorted.length,
      lastSeenAt: latest.lastSeenAt,
      sessions: sorted,
    });
  }

  return groups.sort(
    (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
  );
}
