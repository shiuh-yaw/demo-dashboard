"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";

export interface OHLC {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Alchemy historical response: { symbol, currency, data: [{ value, timestamp }] } */
function alchemyToOHLC(data: {
  data?: Array<{ value: string; timestamp: string }>;
}): OHLC[] {
  const points = data?.data ?? [];
  return points.map((p, i) => {
    const close = parseFloat(p.value) || 0;
    const prevClose = i > 0 ? parseFloat(points[i - 1]!.value) || close : close;
    const open = prevClose;
    const high = Math.max(open, close);
    const low = Math.min(open, close);
    const time = Math.floor(new Date(p.timestamp).getTime() / 1000);
    return { time, open, high, low, close };
  });
}

export type OHLCRange = "1H" | "1D" | "1W" | "1M" | "1Y" | "ALL";

function getTimeRangeForRange(range: OHLCRange): {
  startTime: string;
  endTime: string;
  interval: "5m" | "1h" | "1d";
} {
  const end = new Date();
  const start = new Date();
  if (range === "1H") {
    start.setHours(start.getHours() - 24);
    return { startTime: start.toISOString(), endTime: end.toISOString(), interval: "5m" };
  }
  if (range === "1D") {
    start.setDate(start.getDate() - 1);
    return { startTime: start.toISOString(), endTime: end.toISOString(), interval: "1h" };
  }
  if (range === "1W") {
    start.setDate(start.getDate() - 7);
    return { startTime: start.toISOString(), endTime: end.toISOString(), interval: "1h" };
  }
  if (range === "1M") {
    start.setDate(start.getDate() - 30);
    return { startTime: start.toISOString(), endTime: end.toISOString(), interval: "1d" };
  }
  if (range === "1Y") {
    start.setFullYear(start.getFullYear() - 1);
    return { startTime: start.toISOString(), endTime: end.toISOString(), interval: "1d" };
  }
  // ALL - max history
  start.setFullYear(start.getFullYear() - 5);
  return { startTime: start.toISOString(), endTime: end.toISOString(), interval: "1d" };
}

export function useOHLC(
  symbol: string = "ETH",
  range: OHLCRange = "1D",
) {
  return useQuery({
    queryKey: ["trade", "ohlc", symbol, range],
    queryFn: async () => {
      const { startTime, endTime, interval } = getTimeRangeForRange(range);
      const res = await fetch("/api/trade/historical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          startTime,
          endTime,
          interval,
          withMarketData: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch historical prices");
      const raw = await res.json();
      return alchemyToOHLC(raw);
    },
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
}
