import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DonutChart } from "../src/donut-chart";

afterEach(() => cleanup());

const data = [
  { label: "Vault", value: 60 },
  { label: "Embedded", value: 30 },
  { label: "Other", value: 10 },
];

describe("DonutChart", () => {
  it("renders one arc segment per category", () => {
    const { container } = render(<DonutChart data={data} height={200} />);
    expect(container.querySelectorAll("path")).toHaveLength(data.length);
  });

  it("shows the empty state when data is empty", () => {
    render(<DonutChart data={[]} height={200} />);
    expect(screen.getByText("No data yet")).toBeTruthy();
  });

  it("shows the empty state when every value is zero", () => {
    render(<DonutChart data={[{ label: "a", value: 0 }]} height={200} />);
    expect(screen.getByText("No data yet")).toBeTruthy();
  });

  it("renders an optional string center label", () => {
    render(<DonutChart data={data} height={200} centerLabel="100" />);
    expect(screen.getByText("100")).toBeTruthy();
  });

  it("cycles segment fills through the chart CSS variables, not hardcoded hex", () => {
    const { container } = render(<DonutChart data={data} height={200} />);
    const fills = Array.from(container.querySelectorAll("path")).map((p) =>
      p.getAttribute("fill"),
    );
    expect(fills).toEqual(["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"]);
  });
});
