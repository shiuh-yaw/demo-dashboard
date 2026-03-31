"use client";

import {
  createChart,
  ColorType,
  LineStyle,
  type UTCTimestamp,
  type MouseEventParams,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import type { OHLC } from "@/hooks/use-ohlc";
import type { OHLCRange } from "@/hooks/use-ohlc";

const TIME_RANGES: { value: OHLCRange; label: string }[] = [
  { value: "1H", label: "1H" },
  { value: "1D", label: "1D" },
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "1Y", label: "1Y" },
  { value: "ALL", label: "ALL" },
];

function formatPrice(value: number): string {
  if (value >= 1000)
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (value >= 1)
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

interface PriceChartProps {
  data: OHLC[];
  height?: number;
  isLoading?: boolean;
  error?: boolean;
  range?: OHLCRange;
  onRangeChange?: (range: OHLCRange) => void;
  onCrosshairMove?: (data: { price: number; time: number } | null) => void;
}

function getChartColors(isDark: boolean) {
  if (typeof document === "undefined") {
    return {
      background: "transparent",
      text: "#FFFFFF",
      line: "#4779FF",
      areaTop: "rgba(71, 121, 255, 0.4)",
      areaBottom: "rgba(71, 121, 255, 0.0)",
    };
  }
  const doc = document.documentElement;
  const style = getComputedStyle(doc);
  const text = style.getPropertyValue("--trade-text-primary").trim();
  const accent = style.getPropertyValue("--trade-accent").trim();
  const accentMuted = style.getPropertyValue("--trade-accent-muted").trim();

  return {
    background: "transparent",
    text: text || (isDark ? "#FFFFFF" : "#151618"),
    line: accent || "#4779FF",
    areaTop: isDark
      ? `${accent || "#4779FF"}66`
      : accentMuted || "rgba(71, 121, 255, 0.25)",
    areaBottom: "transparent",
  };
}

export function PriceChart({
  data,
  height = 400,
  isLoading = false,
  error = false,
  range = "1D",
  onRangeChange,
  onCrosshairMove,
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const container = chartContainerRef.current;

    // Always remove existing chart and overlay first to prevent stacking when data/range changes
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (err) {
        console.error("Chart remove error:", err);
      }
      chartRef.current = null;
    }
    overlayRef.current?.remove();
    overlayRef.current = null;

    if (!container || !data.length) return;

    // Clear container to prevent stacking (chart.remove() may leave orphaned elements)
    container.innerHTML = "";

    const colors = getChartColors(isDark);
    const chart = createChart(container, {
      handleScroll: false,
      handleScale: false,
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
      },
      width: container.clientWidth,
      height,
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: {
        visible: false,
        scaleMargins: { top: 0.05, bottom: 0.2 },
      },
      leftPriceScale: { visible: false },
      timeScale: {
        visible: false,
      },
      crosshair: {
        vertLine: {
          color: "rgba(128, 128, 128, 0.5)",
          width: 1,
          style: LineStyle.Dotted,
          labelVisible: false,
        },
        horzLine: {
          color: "rgba(128, 128, 128, 0.5)",
          width: 1,
          style: LineStyle.Dotted,
          labelVisible: false,
        },
      },
    });

    const lineData = data.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.close,
    }));
    const areaSeries = chart.addAreaSeries({
      lineColor: colors.line,
      topColor: colors.areaTop,
      bottomColor: colors.areaBottom,
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: colors.line,
      crosshairMarkerBackgroundColor: colors.line,
    });
    areaSeries.setData(lineData);

    chart.timeScale().fitContent();

    const overlay = document.createElement("div");
    overlay.className = "pointer-events-none absolute inset-0 z-10";
    overlay.style.display = "none";
    const label = document.createElement("span");
    label.className =
      "text-xs text-trade-text-primary px-2 py-0.5 rounded bg-trade-surface/90 backdrop-blur-sm shadow-sm";
    overlay.appendChild(label);
    container.parentElement?.appendChild(overlay);
    overlayRef.current = overlay;

    const crosshairHandler = (param: MouseEventParams) => {
      if (!param.point || !param.seriesData?.get(areaSeries)) {
        overlay.style.display = "none";
        onCrosshairMove?.(null);
        return;
      }
      const d = param.seriesData.get(areaSeries) as {
        time: UTCTimestamp;
        value: number;
      };
      const date = new Date((d.time as number) * 1000);
      const dateStr = date.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      label.textContent = `${formatPrice(d.value)} · ${dateStr}`;
      label.style.position = "absolute";
      label.style.top = "8px";
      const chartWidth = container.clientWidth;
      const edgeThreshold = Math.min(60, chartWidth * 0.12);
      if (param.point.x < edgeThreshold) {
        label.style.left = "0";
        label.style.transform = "none";
      } else if (param.point.x > chartWidth - edgeThreshold) {
        label.style.left = `${chartWidth}px`;
        label.style.transform = "translateX(-100%)";
      } else {
        label.style.left = `${param.point.x}px`;
        label.style.transform = "translateX(-50%)";
      }
      overlay.style.display = "block";
      onCrosshairMove?.({ price: d.value, time: d.time as number });
    };
    chart.subscribeCrosshairMove(crosshairHandler);

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    chartRef.current = chart;
    window.addEventListener("resize", handleResize);

    return () => {
      try {
        chart.unsubscribeCrosshairMove(crosshairHandler);
        overlay.remove();
        overlayRef.current = null;
        window.removeEventListener("resize", handleResize);
        chart.remove();
      } catch (err) {
        console.error("Chart cleanup error:", err);
      }
      chartRef.current = null;
    };
  }, [data, height, isDark, onCrosshairMove, range]);

  if (error) {
    return (
      <div className="flex flex-col min-h-[300px] lg:min-h-[400px]">
        <div className="flex items-center justify-center flex-1 p-8 text-center">
          <p className="text-trade-text-muted">Chart unavailable</p>
          <p className="text-sm text-trade-text-muted mt-1">
            Unable to load price data. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && !data.length) {
    return (
      <div>
        <div
          className="animate-pulse bg-trade-border/20"
          style={{ minHeight: height }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="relative overflow-visible" style={{ minHeight: height }}>
        <div
          ref={chartContainerRef}
          className="relative z-0"
          style={{ minHeight: height }}
        />
      </div>
      {onRangeChange && (
        <div className="flex justify-between w-full px-4 pb-4 pt-2 border-t border-trade-border/30">
          {TIME_RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => {
                try {
                  onRangeChange?.(r.value);
                } catch (err) {
                  console.error("Chart range change error:", err);
                }
              }}
              className={`flex-1 py-1 text-center text-xs font-medium transition-colors rounded-full ${
                range === r.value
                  ? "bg-trade-bg text-trade-text-primary font-semibold"
                  : "text-trade-text-secondary hover:text-trade-text-primary"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
