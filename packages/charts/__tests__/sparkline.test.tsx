import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Sparkline } from "../src/sparkline";

afterEach(() => cleanup());

describe("Sparkline", () => {
  it("renders a line path for sample data", () => {
    const { container } = render(<Sparkline data={[1, 4, 2, 8, 5]} />);
    expect(container.querySelector("path")).toBeTruthy();
  });

  it("renders a muted placeholder line, not a crash, for empty data", () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelector("path")).toBeFalsy();
    expect(container.querySelector("line")).toBeTruthy();
  });

  it("renders a muted placeholder line for all-zero data", () => {
    const { container } = render(<Sparkline data={[0, 0, 0]} />);
    expect(container.querySelector("line")).toBeTruthy();
  });

  it("renders a muted placeholder line, not a malformed path, for a single data point", () => {
    const { container } = render(<Sparkline data={[5]} />);
    expect(container.querySelector("path")).toBeFalsy();
    expect(container.querySelector("line")).toBeTruthy();
  });

  it("renders a valid straight path (no NaN coordinates) for a flat non-zero series", () => {
    const { container } = render(<Sparkline data={[4, 4, 4]} />);
    const d = container.querySelector("path")?.getAttribute("d");
    expect(d).toBeTruthy();
    expect(d).not.toContain("NaN");
  });

  it("uses the chart CSS variable for the stroke, not a hardcoded hex", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} colorIndex={5} />);
    const path = container.querySelector("path");
    expect(path?.getAttribute("stroke")).toBe("var(--chart-5)");
  });
});
