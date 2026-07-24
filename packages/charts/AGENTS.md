---
name: "@dynamic-demos/charts"
kind: package
flow_role: shared-ui
custody: n/a
status: experimental
---

# @dynamic-demos/charts

Themeable chart primitives built on visx (v4, React 19) for the operator dashboard - Overview, demo-detail analytics, prospect analytics. Bespoke demo-illustration look (soft gradients, dotted grid, rounded bars) instead of a default chart-library look. This package has no dashboard wiring; consumers pass data in and render.

## Capabilities

- `<AreaChart>` / `<LineChart>` - time series (e.g. sessions over time), gradient-filled area under a curved line, hover tooltip, end-point marker.
- `<BarChart>` - categorical bars (e.g. engagement by demo), vertical or horizontal, rounded corners.
- `<Sparkline>` - tiny inline trend line, no axes, no tooltip.
- `<DonutChart>` - share/breakdown, segments cycle the five chart colors, optional center label.
- Shared layer: `ResponsiveChart` (width measurement), `ChartGradient`, `DottedGrid`, `ChartTooltip`, `EmptyState`.
- Series colors always resolve through `chartColorVar`/`chartColorForOrdinal` to `var(--chart-1..5)` - never a hardcoded hex, so charts inherit the operator's light/dark theme automatically.

## Public surface

- `AreaChart`, `LineChart` - props `{ data: {x: Date|number|string; y: number}[], height, colorIndex?, valueFormat?, xFormat?, ariaLabel? }`. (stable)
- `BarChart` - props `{ data: {label: string; value: number}[], height, colorIndex?, orientation?: "vertical"|"horizontal", valueFormat?, ariaLabel? }`. (stable)
- `Sparkline` - props `{ data: number[], colorIndex?, width?, height?, ariaLabel? }`. (stable)
- `DonutChart` - props `{ data: {label: string; value: number}[], height, centerLabel?: ReactNode, valueFormat?, ariaLabel? }`. (stable)
- `chartColorVar(index: 1|2|3|4|5)`, `chartColorForOrdinal(ordinal: number)` - color helpers, use these instead of hardcoding a chart color anywhere that consumes this package. (stable)
- `ChartColorIndex`, `SeriesPoint`, `CategoryDatum`, `ValueFormatter`, `XFormatter`, `BaseChartProps` - shared types. (stable)
- `ResponsiveChart`, `ChartGradient`, `DottedGrid`, `ChartTooltip`, `EmptyState` - shared layer, exported for composing new chart types; not required for the four bounded components above. (stable, low-level)

## Required environment

None. Pure client-rendered components; no env vars, no network calls.

## Slots vs invariants

**Slots:**

- `colorIndex` per series/chart (1..5), `height`, `valueFormat`/`xFormat` formatters, `orientation` on `BarChart`, `centerLabel` on `DonutChart`.
- Width is always measured from the parent (`ResponsiveChart` wraps every component) - consumers never pass width.

**Invariants:**

- Series/segment colors always come from `var(--chart-1)`..`var(--chart-5)` via `chartColorVar`/`chartColorForOrdinal`. No component may accept or render a raw hex color for a data series.
- Every component renders the shared `EmptyState` when its data is empty or every value is zero/falsy - never a blank chart, never a thrown error.
- All components are `"use client"` and SSR-safe: `ResponsiveChart` falls back to a fixed width before the browser reports a real one (first paint, and jsdom/SSR without a native `ResizeObserver`), so nothing depends on `window` at render time.
- Grid lines are dotted (`strokeDasharray`) and low-opacity `currentColor`, never a solid heavy axis line - `AxisBottom`/`AxisLeft` render with `hideAxisLine`/`stroke="transparent"` and ticks only.

## Integration map

**Imports:** `@visx/axis`, `@visx/curve`, `@visx/event`, `@visx/gradient`, `@visx/grid`, `@visx/group`, `@visx/responsive`, `@visx/scale`, `@visx/shape`, `@visx/tooltip` (all pinned exact, no `^`/`~`), `react`/`react-dom` (peer).
**Imported by:** none yet - built ahead of dashboard wiring (Overview, demo-detail analytics, prospect analytics are the intended first consumers, not yet wired in this PR).

## Examples

```tsx
import { AreaChart, chartColorVar } from "@dynamic-demos/charts";

<AreaChart
  data={[{ x: new Date("2026-07-01"), y: 12 }, { x: new Date("2026-07-02"), y: 30 }]}
  height={220}
  colorIndex={1}
  valueFormat={(v) => v.toLocaleString()}
/>;
```

## Do / Don't

- Do: let `ResponsiveChart` own width measurement - render these components inside a sized container (flex/grid cell), don't pass a `width` prop (there isn't one).
- Do: use `colorIndex`/`chartColorForOrdinal` for every series color.
- Don't: hardcode a hex color anywhere a chart series or segment is drawn - it breaks operator dark-mode inheritance.
- Don't: import from `src/*.tsx` directly - use the package's `.` export (`@dynamic-demos/charts`).
- Don't: assume `AreaChart`/`LineChart` x-values are all the same kind across renders - pick one of Date, number, or string per chart instance.

## Open questions / known gaps

- Not yet wired into `apps/dashboard` - this PR is package-only, per the phase 08B scope.
- No visual/screenshot regression tests, only smoke + CSS-variable assertions; a follow-up phase should wire this into the dashboard and verify visually.
- `DonutChart` centerLabel only renders string labels inside the SVG `<text>`; non-string `ReactNode` labels render via an absolutely-positioned HTML overlay instead - fine for the current use case, revisit if it needs to participate in SVG-only exports (e.g. PNG snapshot generation).
