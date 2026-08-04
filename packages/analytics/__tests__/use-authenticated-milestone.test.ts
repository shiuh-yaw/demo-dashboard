import { renderHook } from "@testing-library/react";
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

import {
  useAuthenticatedMilestone,
  useIdentify,
} from "../src/use-authenticated-milestone";

beforeEach(() => {
  milestoneMock.mockReset();
  identifyMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAuthenticatedMilestone", () => {
  it("does not fire when user is null", () => {
    renderHook(({ user }) => useAuthenticatedMilestone(user), {
      initialProps: { user: null },
    });

    expect(milestoneMock).not.toHaveBeenCalled();
  });

  it("does not fire when user has no id", () => {
    renderHook(({ user }) => useAuthenticatedMilestone(user), {
      initialProps: { user: { email: "a@b.co" } },
    });

    expect(milestoneMock).not.toHaveBeenCalled();
  });

  it("fires BOTH identify and the authenticated milestone once when identity first resolves", () => {
    const { rerender } = renderHook(
      ({ user }) => useAuthenticatedMilestone(user),
      { initialProps: { user: null as { id?: string; email?: string } | null } },
    );

    expect(milestoneMock).not.toHaveBeenCalled();
    expect(identifyMock).not.toHaveBeenCalled();

    rerender({ user: { id: "u_1", email: "a@b.co" } });

    expect(identifyMock).toHaveBeenCalledTimes(1);
    expect(identifyMock).toHaveBeenCalledWith("u_1", { email: "a@b.co" });

    expect(milestoneMock).toHaveBeenCalledTimes(1);
    expect(milestoneMock).toHaveBeenCalledWith("authenticated", {
      dynamicUserId: "u_1",
      email: "a@b.co",
    });
  });

  it("omits email from identify and milestone props when absent", () => {
    const { rerender } = renderHook(
      ({ user }) => useAuthenticatedMilestone(user),
      { initialProps: { user: null as { id?: string; email?: string } | null } },
    );

    rerender({ user: { id: "u_1" } });

    expect(identifyMock).toHaveBeenCalledTimes(1);
    expect(identifyMock).toHaveBeenCalledWith("u_1", undefined);

    expect(milestoneMock).toHaveBeenCalledTimes(1);
    expect(milestoneMock).toHaveBeenCalledWith("authenticated", {
      dynamicUserId: "u_1",
    });
  });

  it("never double-fires across re-renders, even with new user object identities", () => {
    const { rerender } = renderHook(
      ({ user }) => useAuthenticatedMilestone(user),
      { initialProps: { user: { id: "u_1", email: "a@b.co" } } },
    );

    expect(milestoneMock).toHaveBeenCalledTimes(1);

    // Same identity, new object reference - must not re-fire.
    rerender({ user: { id: "u_1", email: "a@b.co" } });
    // A later user change (e.g. wallet linked) also must not re-fire - the
    // milestone is a one-shot per mount, not a resync on every user change.
    rerender({ user: { id: "u_1", email: "changed@b.co" } });

    expect(milestoneMock).toHaveBeenCalledTimes(1);
  });

  it("does not throw when useTrack is a no-op (outside a GtmTracker provider)", () => {
    milestoneMock.mockImplementation(() => {});

    expect(() => {
      renderHook(({ user }) => useAuthenticatedMilestone(user), {
        initialProps: { user: { id: "u_1" } },
      });
    }).not.toThrow();
  });
});

describe("useIdentify (going-forward alias for useAuthenticatedMilestone)", () => {
  it("is the same alias - fires BOTH identify and the authenticated milestone once", () => {
    expect(useIdentify).toBe(useAuthenticatedMilestone);

    const { rerender } = renderHook(
      ({ user }) => useIdentify(user),
      { initialProps: { user: null as { id?: string; email?: string } | null } },
    );

    expect(milestoneMock).not.toHaveBeenCalled();
    expect(identifyMock).not.toHaveBeenCalled();

    rerender({ user: { id: "u_2", email: "b@b.co" } });

    expect(identifyMock).toHaveBeenCalledTimes(1);
    expect(identifyMock).toHaveBeenCalledWith("u_2", { email: "b@b.co" });

    expect(milestoneMock).toHaveBeenCalledTimes(1);
    expect(milestoneMock).toHaveBeenCalledWith("authenticated", {
      dynamicUserId: "u_2",
      email: "b@b.co",
    });
  });

  it("never double-fires across re-renders", () => {
    const { rerender } = renderHook(
      ({ user }) => useIdentify(user),
      { initialProps: { user: { id: "u_1", email: "a@b.co" } } },
    );

    expect(identifyMock).toHaveBeenCalledTimes(1);
    expect(milestoneMock).toHaveBeenCalledTimes(1);

    rerender({ user: { id: "u_1", email: "changed@b.co" } });

    expect(identifyMock).toHaveBeenCalledTimes(1);
    expect(milestoneMock).toHaveBeenCalledTimes(1);
  });
});
