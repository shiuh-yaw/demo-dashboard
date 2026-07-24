/**
 * Pure formatting helpers for the prospect Overview segment. No
 * React/Next/droplet imports here - keeps this module testable in a plain
 * node environment, unlike the client component that consumes it.
 */

export interface ActivityItem {
  id: string;
  /** Company, captured identity, or a neutral fallback. */
  who: string;
  demoLabel: string;
  /** ISO timestamp of the most recent activity in the session. */
  at: string;
}

// Zero counts read as "-" rather than "0" - consistent empty treatment.
export function formatCount(n: number): string {
  return n > 0 ? String(n) : "-";
}

// Zero sessions prospect-wide means no momentum/funnel signal exists yet - drives a single getting-started panel instead of stacked empty chart shells.
export function hasEngagementData(sessions: number): boolean {
  return sessions > 0;
}

// Never-viewed / zero-empty metrics render "-", matching the My Prospects table.
export function formatLastViewed(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "-";
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Avg session duration -> "3m 23s" / "45s"; zero reads as "-".
export function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return "-";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Momentum bucket dates are UTC-day strings; format in UTC so the axis label
// matches the bucket.
export function formatChartDate(x: Date | number | string): string {
  const d = x instanceof Date ? x : new Date(x);
  if (Number.isNaN(d.getTime())) return String(x);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
