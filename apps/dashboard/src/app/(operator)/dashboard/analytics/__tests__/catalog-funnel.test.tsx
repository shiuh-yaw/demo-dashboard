// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// `@/components/droplet-client` re-exports the whole `@dynamic-labs-sdk/droplet`
// ESM bundle, which top-level-imports `next/link` without an extension - that
// fails strict Node ESM resolution under Vitest (works fine in the real Next
// build, which doesn't enforce that). Stub the primitives this component
// actually uses so the test exercises our own layout/formatting logic without
// dragging in the real UI kit's module graph.
vi.mock("@/components/droplet-client", () => ({
  MetricCard: ({ label, value }: { label: string; value: number | string }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
}));

import { CatalogFunnel } from "../catalog-funnel";

afterEach(() => {
  cleanup();
});

describe("CatalogFunnel", () => {
  it("shows visits, unique visitors, and per-demo rows sorted launches desc", () => {
    render(
      <CatalogFunnel
        data={{
          visits: 120,
          uniqueVisitors: 80,
          byDemo: [
            { slug: "wallet", launches: 30, launchRate: 0.375 },
            { slug: "trade", launches: 10, launchRate: 0.125 },
          ],
        }}
      />,
    );

    expect(screen.getByText("120")).toBeTruthy();
    expect(screen.getByText("80")).toBeTruthy();

    const rows = screen.getAllByRole("row").slice(1); // drop the header row
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("wallet");
    expect(rows[0].textContent).toContain("30");
    expect(rows[0].textContent).toContain("38%");
    expect(rows[1].textContent).toContain("trade");
    expect(rows[1].textContent).toContain("10");
    expect(rows[1].textContent).toContain("13%");
  });

  it("renders an empty state when there are no catalog launches, without crashing", () => {
    render(<CatalogFunnel data={{ visits: 0, uniqueVisitors: 0, byDemo: [] }} />);

    expect(screen.getByText("No catalog launches yet.")).toBeTruthy();
  });
});
