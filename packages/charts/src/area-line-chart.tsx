"use client";

import { AxisBottom, AxisLeft } from "@visx/axis";
import { curveMonotoneX } from "@visx/curve";
import { localPoint } from "@visx/event";
import { Group } from "@visx/group";
import { scaleLinear, scaleTime, scalePoint } from "@visx/scale";
import type { AnyD3Scale } from "@visx/scale";
import { AreaClosed, Circle, LinePath } from "@visx/shape";
import { useTooltip } from "@visx/tooltip";
import { useCallback, useMemo } from "react";
import { ChartGradient } from "./chart-gradient";
import { ChartTooltip } from "./chart-tooltip";
import { DottedGrid } from "./dotted-grid";
import { EmptyState } from "./empty-state";
import { ResponsiveChart } from "./responsive-chart";
import { chartColorVar } from "./theme";
import { defaultValueFormat, isEmptySeries } from "./types";
import type { BaseChartProps, SeriesPoint, XFormatter } from "./types";

const MARGIN = { top: 8, right: 12, bottom: 24, left: 36 };
const DAY_MS = 24 * 60 * 60 * 1000;

// A single point has no span to draw across; synthesize a leading point at the
// same value so the series reads as a flat baseline instead of a lone dot.
function expandSinglePoint(data: SeriesPoint[]): SeriesPoint[] {
  if (data.length !== 1) return data;
  const only = data[0]!;
  if (only.x instanceof Date) {
    return [{ x: new Date(only.x.getTime() - DAY_MS), y: only.y }, only];
  }
  if (typeof only.x === "number") {
    return [{ x: only.x - 1, y: only.y }, only];
  }
  return data;
}

export interface AreaLineChartProps extends BaseChartProps {
  data: SeriesPoint[];
  xFormat?: XFormatter;
}

type XKind = "time" | "linear" | "point";

// x can be Date, number, or a categorical string label - pick the matching scale kind.
function xKind(data: SeriesPoint[]): XKind {
  const first = data[0]?.x;
  if (first instanceof Date) return "time";
  if (typeof first === "number") return "linear";
  return "point";
}

interface Scales {
  xScale: AnyD3Scale;
  yScale: AnyD3Scale;
  innerWidth: number;
  innerHeight: number;
  kind: XKind;
}

// Plain computation (not a hook) so it can be called from inside a render-prop callback safely.
function computeScales(data: SeriesPoint[], width: number, height: number): Scales {
  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
  const innerHeight = Math.max(height - MARGIN.top - MARGIN.bottom, 0);
  const kind = xKind(data);

  let xScale: AnyD3Scale;
  if (kind === "time") {
    const values = data.map((d) => d.x as Date);
    xScale = scaleTime({
      domain: [values[0] ?? new Date(), values[values.length - 1] ?? new Date()],
      range: [0, innerWidth],
    });
  } else if (kind === "linear") {
    const values = data.map((d) => d.x as number);
    xScale = scaleLinear({
      domain: [Math.min(...values), Math.max(...values)],
      range: [0, innerWidth],
    });
  } else {
    xScale = scalePoint({
      domain: data.map((d) => String(d.x)),
      range: [0, innerWidth],
    });
  }

  const values = data.map((d) => d.y);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const yScale = scaleLinear({ domain: [min, max], range: [innerHeight, 0], nice: true });

  return { xScale, yScale, innerWidth, innerHeight, kind };
}

type ScaleFn = (value: never) => number | undefined;

function scaledX(kind: XKind, xScale: AnyD3Scale, d: SeriesPoint): number {
  const value = kind === "point" ? String(d.x) : d.x;
  return (xScale as unknown as ScaleFn)(value as never) ?? 0;
}

interface TooltipDatum {
  point: SeriesPoint;
}

function AreaLineChartBody({
  variant,
  data,
  height,
  colorIndex = 1,
  valueFormat = defaultValueFormat,
  xFormat,
  ariaLabel,
}: AreaLineChartProps & { variant: "area" | "line" }) {
  const { tooltipData, tooltipOpen, tooltipLeft, tooltipTop, showTooltip, hideTooltip } =
    useTooltip<TooltipDatum>();
  const gradientId = `chart-area-gradient-${colorIndex}`;
  const color = chartColorVar(colorIndex);
  const plotData = useMemo(() => expandSinglePoint(data), [data]);

  const handleMove = useCallback(
    (scales: Scales, event: React.MouseEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (!point) return;
      const relativeX = point.x - MARGIN.left;
      let closest = plotData[0];
      let closestDist = Infinity;
      for (const d of plotData) {
        const dist = Math.abs(scaledX(scales.kind, scales.xScale, d) - relativeX);
        if (dist < closestDist) {
          closestDist = dist;
          closest = d;
        }
      }
      if (!closest) return;
      showTooltip({
        tooltipData: { point: closest },
        tooltipLeft: scaledX(scales.kind, scales.xScale, closest) + MARGIN.left,
        tooltipTop: (scales.yScale(closest.y) as number) + MARGIN.top,
      });
    },
    [plotData, showTooltip],
  );

  if (isEmptySeries(data)) {
    return <EmptyState height={height} />;
  }

  return (
    <ResponsiveChart height={height} ariaLabel={ariaLabel ?? "Trend chart"}>
      {({ width, height: h }) => {
        const scales = computeScales(plotData, width, h);
        const { xScale, yScale, innerWidth, innerHeight, kind } = scales;
        const last = plotData[plotData.length - 1] as SeriesPoint;
        return (
          <div style={{ position: "relative" }}>
            <svg width={width} height={h}>
              <ChartGradient id={gradientId} colorIndex={colorIndex} />
              <Group left={MARGIN.left} top={MARGIN.top}>
                <DottedGrid scale={yScale} width={innerWidth} />
                {variant === "area" ? (
                  <AreaClosed<SeriesPoint>
                    data={plotData}
                    x={(d) => scaledX(kind, xScale, d)}
                    y={(d) => (yScale(d.y) as number) ?? 0}
                    yScale={yScale}
                    curve={curveMonotoneX}
                    fill={`url(#${gradientId})`}
                    stroke="none"
                  />
                ) : null}
                <LinePath<SeriesPoint>
                  data={plotData}
                  x={(d) => scaledX(kind, xScale, d)}
                  y={(d) => (yScale(d.y) as number) ?? 0}
                  curve={curveMonotoneX}
                  stroke={color}
                  strokeWidth={2}
                />
                <Circle
                  cx={scaledX(kind, xScale, last)}
                  cy={(yScale(last.y) as number) ?? 0}
                  r={3.5}
                  fill={color}
                />
                <AxisLeft
                  scale={yScale}
                  numTicks={4}
                  stroke="transparent"
                  tickStroke="transparent"
                  tickLabelProps={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }}
                  tickFormat={(v) => valueFormat(Number(v))}
                />
                <AxisBottom
                  scale={xScale}
                  top={innerHeight}
                  hideAxisLine
                  tickStroke="transparent"
                  tickLabelProps={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }}
                  numTicks={Math.min(plotData.length, 5)}
                  tickFormat={(v) => (xFormat ? xFormat(v as Date | number | string) : String(v))}
                />
                <rect
                  width={innerWidth}
                  height={innerHeight}
                  fill="transparent"
                  onMouseMove={(e) => handleMove(scales, e)}
                  onMouseLeave={() => hideTooltip()}
                />
              </Group>
            </svg>
            {tooltipOpen && tooltipData ? (
              <ChartTooltip top={tooltipTop ?? 0} left={tooltipLeft ?? 0}>
                {xFormat ? xFormat(tooltipData.point.x) : String(tooltipData.point.x)}
                {" - "}
                {valueFormat(tooltipData.point.y)}
              </ChartTooltip>
            ) : null}
          </div>
        );
      }}
    </ResponsiveChart>
  );
}

// AreaChart - primary time-series visual (e.g. sessions over time), gradient-filled area under a line.
export function AreaChart(props: AreaLineChartProps) {
  return <AreaLineChartBody {...props} variant="area" />;
}

// LineChart - same axes/tooltip contract as AreaChart, no fill beneath the line.
export function LineChart(props: AreaLineChartProps) {
  return <AreaLineChartBody {...props} variant="line" />;
}
