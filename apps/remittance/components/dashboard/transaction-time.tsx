"use client";

import { useState, useEffect } from "react";

export function parseTxDate(timestamp: string): Date | null {
  if (!timestamp) return null;
  const date = /^\d+$/.test(timestamp)
    ? new Date(parseInt(timestamp, 10) * 1000)
    : new Date(timestamp);
  return isNaN(date.getTime()) ? null : date;
}

function formatTimeDisplay(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TxTime({ timestamp }: { timestamp: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const date = parseTxDate(timestamp);
  if (!date) return <span className="text-(--brand-muted)">—</span>;

  return <span title={date.toLocaleString()}>{formatTimeDisplay(date)}</span>;
}
