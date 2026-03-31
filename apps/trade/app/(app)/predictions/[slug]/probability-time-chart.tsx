"use client";

/**
 * Multi-line probability-over-time chart - Polymarket-style.
 *
 * - Linear 0-100% scale
 * - Horizontal dotted grid lines
 * - Custom crosshair with vertical line
 * - Colored pill tooltips at each series intersection
 * - Legend with bold percentages
 */

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  CrosshairMode,
  PriceScaleMode,
  type UTCTimestamp,
} from "lightweight-charts";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import type { PolymarketMarketTransformed } from "@dynamic-demos/polymarket";
import {
  getPricesHistory,
  computePriceChange,
  type PricePoint,
} from "@dynamic-demos/polymarket";

const CHART_COLORS = [
  "#4779FF",
  "#60a5fa",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

interface ProbabilityTimeChartProps {
  markets: PolymarketMarketTransformed[];
  /** Event start date (ISO) - pass to CLOB for full history back to market creation */
  eventStartDate?: string;
  height?: number;
  onPriceChanges?: (changes: Map<string, number>) => void;
}

/** Convert CLOB price (0–1) to display % (0–100). Use minVal for log scale. */
function toDisplayPct(p: number, minVal = 0): number {
  const raw = p <= 1 && p > 0 ? p * 100 : p;
  return minVal > 0 ? Math.max(raw, minVal) : raw;
}

function formatTooltipDate(time: number): string {
  const d = new Date(time * 1000);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Polymarket-style: show "<1%" for values below 1 */
function formatPct(pct: string | number): string {
  const n = typeof pct === "string" ? parseFloat(pct) : pct;
  if (Number.isNaN(n)) return "0%";
  return n < 1 && n > 0 ? "<1%" : `${n.toFixed(1)}%`;
}

export function ProbabilityTimeChart({
  markets,
  eventStartDate,
  height = 280,
  onPriceChanges,
}: ProbabilityTimeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const tooltipContainerRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const marketsWithTokens = markets.filter((m) => m.yesTokenId);
  const startTs =
    eventStartDate != null
      ? Math.floor(new Date(eventStartDate).getTime() / 1000)
      : undefined;

  const tokenQueries = useQuery({
    queryKey: [
      "polymarket",
      "prices-history",
      "all",
      startTs,
      marketsWithTokens.map((m) => m.yesTokenId).join(","),
    ],
    queryFn: async () => {
      const results = await Promise.allSettled(
        marketsWithTokens.map((m) =>
          getPricesHistory({
            tokenId: m.yesTokenId!,
            interval: "all",
            startTs,
          }),
        ),
      );
      const histories = results.map((r) =>
        r.status === "fulfilled" ? r.value : [],
      );
      const byMarketId = new Map<string, PricePoint[]>();
      const changes = new Map<string, number>();
      marketsWithTokens.forEach((m, i) => {
        const h = histories[i] ?? [];
        byMarketId.set(m.id, h);
        const ch = computePriceChange(h);
        if (ch != null) changes.set(m.id, ch);
      });
      onPriceChanges?.(changes);
      return { byMarketId, changes };
    },
    enabled: marketsWithTokens.length > 0,
  });

  const { data } = tokenQueries;
  const histories = data?.byMarketId ?? new Map();

  useEffect(() => {
    if (data?.changes) onPriceChanges?.(data.changes);
  }, [data?.changes, onPriceChanges]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || marketsWithTokens.length === 0) return;

    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch {
        /* ignore */
      }
      chartRef.current = null;
    }
    tooltipContainerRef.current?.remove();
    tooltipContainerRef.current = null;
    container.innerHTML = "";

    // Polymarket-style: high-contrast labels and grid for readability
    const textColor = isDark ? "#E5E7EB" : "#374151";
    const gridColor = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)";

    const chart = createChart(container, {
      handleScroll: false,
      handleScale: false,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor,
        fontSize: 12,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        attributionLogo: false,
      },
      width: container.clientWidth,
      height,
      grid: {
        vertLines: { visible: false },
        horzLines: {
          visible: true,
          color: gridColor,
          style: LineStyle.Dotted,
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.02, bottom: 0.02 },
        autoScale: true,
        mode: PriceScaleMode.Normal,
        ticksVisible: true,
      },
      leftPriceScale: { visible: false },
      timeScale: {
        borderVisible: false,
        visible: true,
        timeVisible: false,
        secondsVisible: false,
        tickMarkFormatter: (time) => {
          const d =
            typeof time === "number"
              ? new Date(time * 1000)
              : new Date(
                  (time as { year: number }).year,
                  ((time as { month?: number }).month ?? 1) - 1,
                  (time as { day?: number }).day ?? 1,
                );
          return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          visible: true,
          width: 1,
          color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)",
          style: LineStyle.Solid,
          labelVisible: false,
        },
        horzLine: {
          visible: false,
          labelVisible: false,
        },
      },
      localization: {
        priceFormatter: (p: number) => `${p.toFixed(1)}%`,
      },
    });

    const sorted = [...marketsWithTokens]
      .sort((a, b) => parseFloat(b.yesPrice) - parseFloat(a.yesPrice))
      .slice(0, 4);

    const seriesMap = new Map<unknown, { label: string; color: string }>();

    sorted.forEach((market, i) => {
      const h = histories.get(market.id) ?? [];
      if (h.length < 2) return;

      const minVal = 0;
      const raw = h.map((pt: PricePoint) => ({
        time: pt.t as UTCTimestamp,
        value: toDisplayPct(pt.p, minVal),
      }));
      // Lightweight-charts requires strictly ascending time; dedupe by keeping last per timestamp
      const byTime = new Map<number, { time: UTCTimestamp; value: number }>();
      for (const d of raw) {
        byTime.set(d.time as number, d);
      }
      const lineData = [...byTime.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, d]) => d);

      const color = CHART_COLORS[i % CHART_COLORS.length];
      const series = chart.addLineSeries({
        color,
        lineWidth: 2,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(lineData);
      seriesMap.set(series, {
        label: market.outcomeLabel ?? market.question ?? "",
        color: color ?? "#4779FF",
      });
    });

    // Custom tooltip container - colored pills at each series
    const tooltipContainer = document.createElement("div");
    tooltipContainer.className = "pointer-events-none absolute inset-0 z-10";
    tooltipContainer.style.display = "none";
    const parent = container.parentElement;
    if (parent) parent.appendChild(tooltipContainer);
    tooltipContainerRef.current = tooltipContainer;

    const dateLabel = document.createElement("div");
    dateLabel.className = "absolute bottom-2 left-0 text-[10px] font-medium";
    dateLabel.style.color = isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)";
    tooltipContainer.appendChild(dateLabel);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const crosshairHandler = (param: any) => {
      if (
        !param.point ||
        param.point.x < 0 ||
        param.point.y < 0 ||
        !param.time ||
        param.seriesData.size === 0
      ) {
        tooltipContainer.style.display = "none";
        return;
      }

      tooltipContainer.style.display = "block";
      const timeNum = param.time as number;
      dateLabel.textContent = formatTooltipDate(timeNum) ?? "";
      dateLabel.style.left = `${param.point.x}px`;
      dateLabel.style.transform = "translateX(-50%)";

      // Remove old pills
      const existing = tooltipContainer.querySelectorAll("[data-pill]");
      existing.forEach((el) => el.remove());

      const PILL_HEIGHT = 24;
      const PILL_GAP = 4;
      const PILL_WIDTH = 80;
      const X_OFFSET = 10;
      const EDGE_MARGIN = 12;
      const BOTTOM_MARGIN = 28;

      const chartWidth = container.clientWidth;
      const chartHeight = height;
      const minTop = EDGE_MARGIN;
      const maxBottom = chartHeight - BOTTOM_MARGIN - PILL_HEIGHT / 2;

      const items: { meta: { label: string; color: string }; value: number; y: number }[] = [];
      param.seriesData.forEach(
        (
          data: { value?: number },
          series: { priceToCoordinate: (v: number) => number | null },
        ) => {
          const meta = seriesMap.get(series);
          if (!meta) return;
          const value = data.value ?? 0;
          const y = series.priceToCoordinate(value);
          if (y === null) return;
          items.push({ meta, value, y });
        },
      );

      items.sort((a, b) => b.y - a.y);

      for (let i = 1; i < items.length; i++) {
        const prevTop = items[i - 1]!.y - PILL_HEIGHT / 2;
        const maxY = prevTop - PILL_GAP - PILL_HEIGHT / 2;
        if (items[i]!.y > maxY) {
          const newY = maxY;
          if (newY - PILL_HEIGHT / 2 >= minTop) {
            items[i]!.y = newY;
          }
        }
      }

      const crosshairX = param.point!.x;
      const fitsRight = crosshairX + X_OFFSET + PILL_WIDTH <= chartWidth - EDGE_MARGIN;
      const fitsLeft = crosshairX - X_OFFSET - PILL_WIDTH >= EDGE_MARGIN;
      const onRight = fitsRight || !fitsLeft;
      const x = onRight
        ? Math.min(crosshairX + X_OFFSET, chartWidth - PILL_WIDTH - EDGE_MARGIN)
        : Math.max(crosshairX - X_OFFSET, EDGE_MARGIN + PILL_WIDTH);

      items.forEach(({ meta, value, y }) => {
        const clampedY = Math.max(minTop + PILL_HEIGHT / 2, Math.min(maxBottom, y));
        const pill = document.createElement("div");
        pill.setAttribute("data-pill", "true");
        pill.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${clampedY}px;
          transform: ${onRight ? "translateY(-50%)" : "translate(-100%, -50%)"};
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        `;
        pill.style.backgroundColor = meta.color;
        pill.textContent = `${meta.label} ${formatPct(value)}`;
        tooltipContainer.appendChild(pill);
      });
    };

    chart.subscribeCrosshairMove(crosshairHandler);
    chart.timeScale().fitContent();

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      chart.unsubscribeCrosshairMove(crosshairHandler);
      window.removeEventListener("resize", handleResize);
      tooltipContainer.remove();
      tooltipContainerRef.current = null;
      try {
        chart.remove();
      } catch {
        /* ignore */
      }
      chartRef.current = null;
    };
  }, [histories, height, isDark, marketsWithTokens]);

  if (marketsWithTokens.length === 0) return null;

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {[...marketsWithTokens]
          .sort((a, b) => parseFloat(b.yesPrice) - parseFloat(a.yesPrice))
          .slice(0, 4)
          .map((m, i) => (
            <div key={m.id} className="flex items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="text-xs font-semibold text-trade-text-primary">
                {m.outcomeLabel ?? m.question}{" "}
                <span className="font-bold">{formatPct(m.yesPrice)}</span>
              </span>
            </div>
          ))}
      </div>
      {tokenQueries.isLoading && !data ? (
        <div
          className="animate-pulse rounded bg-trade-border/20"
          style={{ height }}
        />
      ) : (
        <div className="relative -mx-4" style={{ minHeight: height }}>
          <div
            ref={chartContainerRef}
            className="pr-12"
            style={{ minHeight: height }}
          />
        </div>
      )}
    </div>
  );
}
