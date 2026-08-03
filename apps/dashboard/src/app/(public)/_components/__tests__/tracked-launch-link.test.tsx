// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { stepMock } = vi.hoisted(() => ({
  stepMock: vi.fn(),
}));

vi.mock("@dynamic-demos/analytics", () => ({
  GtmTracker: ({ children }: { children: React.ReactNode }) => children,
  useTrack: () => ({ step: stepMock, milestone: vi.fn() }),
}));

import { GtmTracker } from "@dynamic-demos/analytics";
import { TrackedLaunchLink } from "../tracked-launch-link";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TrackedLaunchLink", () => {
  it("fires demo_launch with the demo slug on click, keeps href/target/rel", () => {
    render(
      <GtmTracker demoSlug="catalog">
        <TrackedLaunchLink
          demoSlug="wallet"
          href="/x"
          target="_blank"
          rel="noreferrer"
        >
          Launch
        </TrackedLaunchLink>
      </GtmTracker>,
    );

    const link = screen.getByRole("link", { name: "Launch" });
    expect(link.getAttribute("href")).toBe("/x");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer");

    fireEvent.click(link);

    expect(stepMock).toHaveBeenCalledTimes(1);
    expect(stepMock).toHaveBeenCalledWith("demo_launch", { demo: "wallet" });
  });

  it("stays fail-silent if step() throws", () => {
    stepMock.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    render(
      <TrackedLaunchLink demoSlug="wallet" href="/x">
        Launch
      </TrackedLaunchLink>,
    );

    const link = screen.getByRole("link", { name: "Launch" });
    expect(() => fireEvent.click(link)).not.toThrow();
  });
});
