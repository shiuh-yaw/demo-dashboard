/**
 * Rain transaction dates come back as ISO date-time strings. Show a relative
 * "time ago" for recent activity, falling back to a short date past a week.
 */
export function formatTransactionDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return "";

  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 45) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
