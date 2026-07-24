"use client";

import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { BarRounded } from "@visx/shape";
import { useTooltip } from "@visx/tooltip";
import { ChartTooltip } from "./chart-tooltip";
import { DottedGrid } from "./dotted-grid";
import { EmptyState } from "./empty-state";
import { ResponsiveChart } from "./responsive-chart";
import { chartColorVar } from "./theme";
import { defaultValueFormat, isEmptyCategories } from "./types";
import type { BaseChartProps, CategoryDatum } from "./types";

const MARGIN = { top: 8, right: 12, bottom: 28, left: 40 };
const BAR_RADIUS = 6;
const HORIZONTAL_LABEL_FONT_SIZE = 10;
const HORIZONTAL_LABEL_MAX_MARGIN = 140;

// Rough sans-serif average char width at the tick font size - avoids clipping labels like "Remittance".
function estimateLabelWidth(label: string): number {
  return label.length * HORIZONTAL_LABEL_FONT_SIZE * 0.62;
}

// Horizontal orientation reserves a left gutter sized to the longest label instead of a fixed margin.
function horizontalLeftMargin(labels: string[]): number {
  const longest = labels.reduce((max, label) => Math.max(max, estimateLabelWidth(label)), 0);
  return Math.min(HORIZONTAL_LABEL_MAX_MARGIN, Math.max(MARGIN.left, longest + 16));
}

export interface BarChartProps extends BaseChartProps {
  data: CategoryDatum[];
  orientation?: "vertical" | "horizontal";
}

interface TooltipDatum {
  datum: CategoryDatum;
}

// Categorical bars - e.g. "Engagement by Demo". Vertical by default, horizontal for long labels.
export function BarChart({
  data,
  height,
  colorIndex = 1,
  valueFormat = defaultValueFormat,
  orientation = "vertical",
  ariaLabel,
}: BarChartProps) {
  const { tooltipData, tooltipOpen, tooltipLeft, tooltipTop, showTooltip, hideTooltip } =
    useTooltip<TooltipDatum>();
  const color = chartColorVar(colorIndex);

  if (isEmptyCategories(data)) {
    return <EmptyState height={height} />;
  }

  return (
    <ResponsiveChart height={height} ariaLabel={ariaLabel ?? "Bar chart"}>
      {({ width, height: h }) => {
        const values = data.map((d) => d.value);
        const maxValue = Math.max(...values, 0);

        if (orientation === "horizontal") {
          const leftMargin = horizontalLeftMargin(data.map((d) => d.label));
          const innerWidth = Math.max(width - leftMargin - MARGIN.right, 0);
          const innerHeight = Math.max(h - MARGIN.top - MARGIN.bottom, 0);
          const bandScale = scaleBand({
            domain: data.map((d) => d.label),
            range: [0, innerHeight],
            padding: 0.3,
          });
          const valueScale = scaleLinear({
            domain: [0, maxValue],
            range: [0, innerWidth],
            nice: true,
          });
          return (
            <div style={{ position: "relative" }}>
              <svg width={width} height={h}>
                <Group left={leftMargin} top={MARGIN.top}>
                  <DottedGrid scale={valueScale} width={innerWidth} numTicks={4} />
                  {data.map((d) => {
                    const barHeight = bandScale.bandwidth();
                    const barWidth = valueScale(d.value) ?? 0;
                    const barY = bandScale(d.label) ?? 0;
                    return (
                      <BarRounded
                        key={d.label}
                        x={0}
                        y={barY}
                        width={barWidth}
                        height={barHeight}
                        radius={BAR_RADIUS}
                        right
                        fill={color}
                        onMouseMove={(e) =>
                          showTooltip({
                            tooltipData: { datum: d },
                            tooltipLeft: e.clientX,
                            tooltipTop: e.clientY,
                          })
                        }
                        onMouseLeave={() => hideTooltip()}
                      />
                    );
                  })}
                  <AxisLeft
                    scale={bandScale}
                    stroke="transparent"
                    tickStroke="transparent"
                    tickLabelProps={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
                  />
                </Group>
              </svg>
              {tooltipOpen && tooltipData ? (
                <ChartTooltip top={tooltipTop ?? 0} left={tooltipLeft ?? 0}>
                  {tooltipData.datum.label} - {valueFormat(tooltipData.datum.value)}
                </ChartTooltip>
              ) : null}
            </div>
          );
        }

        const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
        const innerHeight = Math.max(h - MARGIN.top - MARGIN.bottom, 0);
        const bandScale = scaleBand({
          domain: data.map((d) => d.label),
          range: [0, innerWidth],
          padding: 0.3,
        });
        const valueScale = scaleLinear({
          domain: [0, maxValue],
          range: [innerHeight, 0],
          nice: true,
        });

        return (
          <div style={{ position: "relative" }}>
            <svg width={width} height={h}>
              <Group left={MARGIN.left} top={MARGIN.top}>
                <DottedGrid scale={valueScale} width={innerWidth} numTicks={4} />
                {data.map((d) => {
                  const barWidth = bandScale.bandwidth();
                  const barHeight = innerHeight - (valueScale(d.value) ?? 0);
                  const barX = bandScale(d.label) ?? 0;
                  const barY = innerHeight - barHeight;
                  return (
                    <BarRounded
                      key={d.label}
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      radius={BAR_RADIUS}
                      top
                      fill={color}
                      onMouseMove={(e) =>
                        showTooltip({
                          tooltipData: { datum: d },
                          tooltipLeft: e.clientX,
                          tooltipTop: e.clientY,
                        })
                      }
                      onMouseLeave={() => hideTooltip()}
                    />
                  );
                })}
                <AxisBottom
                  scale={bandScale}
                  top={innerHeight}
                  hideAxisLine
                  tickStroke="transparent"
                  tickLabelProps={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
                />
              </Group>
            </svg>
            {tooltipOpen && tooltipData ? (
              <ChartTooltip top={tooltipTop ?? 0} left={tooltipLeft ?? 0}>
                {tooltipData.datum.label} - {valueFormat(tooltipData.datum.value)}
              </ChartTooltip>
            ) : null}
          </div>
        );
      }}
    </ResponsiveChart>
  );
}
