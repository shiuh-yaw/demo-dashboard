import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BarChart } from "../src/bar-chart";

afterEach(() => cleanup());

const data = [
  { label: "Wallet", value: 42 },
  { label: "Checkouts", value: 17 },
  { label: "Earn", value: 5 },
];

describe("BarChart", () => {
  it("renders one bar per category (vertical, default)", () => {
    const { container } = render(<BarChart data={data} height={220} />);
    expect(container.querySelectorAll("path")).toHaveLength(data.length);
  });

  it("renders one bar per category (horizontal)", () => {
    const { container } = render(<BarChart data={data} height={220} orientation="horizontal" />);
    expect(container.querySelectorAll("path")).toHaveLength(data.length);
  });

  it("shows the empty state when data is empty", () => {
    render(<BarChart data={[]} height={220} />);
    expect(screen.getByText("No data yet")).toBeTruthy();
  });

  it("shows the empty state when every value is zero", () => {
    render(<BarChart data={[{ label: "a", value: 0 }]} height={220} />);
    expect(screen.getByText("No data yet")).toBeTruthy();
  });

  it("uses the chart CSS variable for bar fill, not a hardcoded hex", () => {
    const { container } = render(<BarChart data={data} height={220} colorIndex={3} />);
    const bar = container.querySelector("path");
    expect(bar?.getAttribute("fill")).toBe("var(--chart-3)");
  });

  it("widens the horizontal left gutter for long labels instead of the default margin", () => {
    const longLabels = [
      { label: "Remittance", value: 10 },
      { label: "Checkouts", value: 5 },
    ];
    const { container } = render(
      <BarChart data={longLabels} height={220} orientation="horizontal" />,
    );
    const group = container.querySelector("g");
    const translateMatch = group?.getAttribute("transform")?.match(/translate\(([-\d.]+)/);
    const left = translateMatch ? Number(translateMatch[1]) : 0;
    expect(left).toBeGreaterThan(40);
  });
});
