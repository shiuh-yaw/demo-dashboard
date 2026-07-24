import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AreaChart } from "../src/area-line-chart";

afterEach(() => cleanup());

const data = [
  { x: new Date("2026-01-01"), y: 10 },
  { x: new Date("2026-01-02"), y: 24 },
  { x: new Date("2026-01-03"), y: 18 },
];

describe("AreaChart", () => {
  it("renders without crashing given sample data", () => {
    const { container } = render(<AreaChart data={data} height={200} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("shows the empty state when data is empty", () => {
    render(<AreaChart data={[]} height={200} />);
    expect(screen.getByText("No data yet")).toBeTruthy();
  });

  it("shows the empty state when every y value is zero", () => {
    const zeroData = [
      { x: new Date("2026-01-01"), y: 0 },
      { x: new Date("2026-01-02"), y: 0 },
    ];
    render(<AreaChart data={zeroData} height={200} />);
    expect(screen.getByText("No data yet")).toBeTruthy();
  });

  it("renders a flat baseline for a single point instead of a lone dot", () => {
    const single = [{ x: new Date("2026-01-01"), y: 12 }];
    const { container } = render(<AreaChart data={single} height={200} />);
    // Not the empty state - a single nonzero point is real data.
    expect(screen.queryByText("No data yet")).toBeNull();
    // A drawable line path exists (the synthesized 2-point flat baseline).
    const linePath = container.querySelector("path[stroke]:not([stroke='none'])");
    expect(linePath).toBeTruthy();
    expect(linePath?.getAttribute("d")).toBeTruthy();
  });

  it("uses the chart CSS variable for its series color, not a hardcoded hex", () => {
    const { container } = render(<AreaChart data={data} height={200} colorIndex={2} />);
    const path = container.querySelector("path[fill^='url(']");
    expect(path).toBeTruthy();
    const stop = container.querySelector("stop");
    expect(stop?.getAttribute("stop-color")).toBe("var(--chart-2)");
  });
});
