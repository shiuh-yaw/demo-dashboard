"use client";

import { Group } from "@visx/group";
import { Pie } from "@visx/shape";
import { useTooltip } from "@visx/tooltip";
import type { ReactNode } from "react";
import { ChartTooltip } from "./chart-tooltip";
import { EmptyState } from "./empty-state";
import { ResponsiveChart } from "./responsive-chart";
import { chartColorForOrdinal } from "./theme";
import { defaultValueFormat, isEmptyCategories } from "./types";
import type { BaseChartProps, CategoryDatum } from "./types";

export interface DonutChartProps extends Omit<BaseChartProps, "colorIndex"> {
  data: CategoryDatum[];
  centerLabel?: ReactNode;
}

interface TooltipDatum {
  datum: CategoryDatum;
}

// Share/breakdown donut - segments cycle --chart-1..5 in input order, optional center label.
export function DonutChart({
  data,
  height,
  valueFormat = defaultValueFormat,
  centerLabel,
  ariaLabel,
}: DonutChartProps) {
  const { tooltipData, tooltipOpen, tooltipLeft, tooltipTop, showTooltip, hideTooltip } =
    useTooltip<TooltipDatum>();

  if (isEmptyCategories(data)) {
    return <EmptyState height={height} />;
  }

  return (
    <ResponsiveChart height={height} ariaLabel={ariaLabel ?? "Breakdown donut chart"}>
      {({ width, height: h }) => {
        const radius = Math.min(width, h) / 2;
        const donutThickness = radius * 0.32;
        return (
          <div style={{ position: "relative" }}>
            <svg width={width} height={h}>
              <Group top={h / 2} left={width / 2}>
                <Pie<CategoryDatum>
                  data={data}
                  pieValue={(d) => d.value}
                  outerRadius={radius - 2}
                  innerRadius={radius - 2 - donutThickness}
                  cornerRadius={4}
                  padAngle={0.02}
                >
                  {(pie) =>
                    pie.arcs.map((arc, i) => (
                      <path
                        key={arc.data.label}
                        d={pie.path(arc) ?? undefined}
                        fill={chartColorForOrdinal(i)}
                        onMouseMove={(e) =>
                          showTooltip({
                            tooltipData: { datum: arc.data },
                            tooltipLeft: e.clientX,
                            tooltipTop: e.clientY,
                          })
                        }
                        onMouseLeave={() => hideTooltip()}
                      />
                    ))
                  }
                </Pie>
              </Group>
              {centerLabel ? (
                <text
                  x={width / 2}
                  y={h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={13}
                  fill="currentColor"
                >
                  {typeof centerLabel === "string" ? centerLabel : ""}
                </text>
              ) : null}
            </svg>
            {centerLabel && typeof centerLabel !== "string" ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                {centerLabel}
              </div>
            ) : null}
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
