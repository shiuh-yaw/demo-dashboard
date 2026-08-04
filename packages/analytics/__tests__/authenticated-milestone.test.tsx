import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { milestoneMock, identifyMock } = vi.hoisted(() => ({
  milestoneMock: vi.fn(),
  identifyMock: vi.fn(),
}));

vi.mock("../src/use-track", () => ({
  useTrack: () => ({
    milestone: milestoneMock,
    identify: identifyMock,
    step: vi.fn(),
    track: vi.fn(),
    page: vi.fn(),
  }),
}));

import { AuthenticatedMilestone } from "../src/authenticated-milestone";

beforeEach(() => {
  milestoneMock.mockReset();
  identifyMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("<AuthenticatedMilestone />", () => {
  it("renders nothing", () => {
    const { container } = render(<AuthenticatedMilestone user={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("fires the milestone once identity resolves, mirroring the hook", () => {
    const { rerender } = render(<AuthenticatedMilestone user={null} />);
    expect(milestoneMock).not.toHaveBeenCalled();

    rerender(<AuthenticatedMilestone user={{ id: "u_1", email: "a@b.co" }} />);

    expect(identifyMock).toHaveBeenCalledTimes(1);
    expect(identifyMock).toHaveBeenCalledWith("u_1", { email: "a@b.co" });

    expect(milestoneMock).toHaveBeenCalledTimes(1);
    expect(milestoneMock).toHaveBeenCalledWith("authenticated", {
      dynamicUserId: "u_1",
      email: "a@b.co",
    });
  });
});
