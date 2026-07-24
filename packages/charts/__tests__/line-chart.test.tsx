import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LineChart } from "../src/area-line-chart";

afterEach(() => cleanup());

const data = [
  { x: 1, y: 5 },
  { x: 2, y: 9 },
  { x: 3, y: 4 },
];

describe("LineChart", () => {
  it("renders without crashing given sample data", () => {
    const { container } = render(<LineChart data={data} height={180} />);
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelector("path")).toBeTruthy();
  });

  it("shows the empty state when data is empty", () => {
    render(<LineChart data={[]} height={180} />);
    expect(screen.getByText("No data yet")).toBeTruthy();
  });

  it("uses the chart CSS variable for the line stroke, not a hardcoded hex", () => {
    const { container } = render(<LineChart data={data} height={180} colorIndex={4} />);
    const line = container.querySelector("path[stroke]:not([stroke='none'])");
    expect(line?.getAttribute("stroke")).toBe("var(--chart-4)");
  });

  it("accepts a categorical string x-axis without crashing", () => {
    const stringData = [
      { x: "Mon", y: 3 },
      { x: "Tue", y: 8 },
    ];
    const { container } = render(<LineChart data={stringData} height={180} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
