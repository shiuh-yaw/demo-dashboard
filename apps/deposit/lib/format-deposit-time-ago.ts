const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** Human-readable "time since" for deposit rows; pass a ticking `nowMs` for live updates. */
export function formatDepositTimeAgo(
  createdAtMs: number,
  nowMs: number,
): string {
  const t = Math.min(createdAtMs, nowMs);
  const diffSec = Math.floor((t - nowMs) / 1000);
  const secAgo = -diffSec;

  if (secAgo < 60) {
    return "Just now";
  }

  const minAgo = Math.floor(secAgo / 60);
  if (minAgo < 60) {
    return relative.format(-minAgo, "minute");
  }

  const hrAgo = Math.floor(minAgo / 60);
  if (hrAgo < 24) {
    return relative.format(-hrAgo, "hour");
  }

  const dayAgo = Math.floor(hrAgo / 24);
  if (dayAgo < 7) {
    return relative.format(-dayAgo, "day");
  }

  const weekAgo = Math.floor(dayAgo / 7);
  if (weekAgo < 8) {
    return relative.format(-weekAgo, "week");
  }

  try {
    const d = new Date(t);
    const thisYear = new Date(nowMs).getFullYear();
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...(d.getFullYear() < thisYear ? { year: "numeric" } : {}),
    });
  } catch {
    return "";
  }
}
