import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GtmTrackerContextValue } from "../src/tracker";

const { useGtmTrackerContextMock } = vi.hoisted(() => ({
  useGtmTrackerContextMock: vi.fn(
    (): GtmTrackerContextValue | null => null,
  ),
}));

vi.mock("../src/tracker", () => ({
  useGtmTrackerContext: () => useGtmTrackerContextMock(),
}));

import { useTrack } from "../src/use-track";

beforeEach(() => {
  useGtmTrackerContextMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useTrack outside a <GtmTracker> provider", () => {
  beforeEach(() => {
    // Matches the real default: useContext(GtmTrackerContext) resolves to
    // null when no <GtmTracker> is mounted above the caller.
    useGtmTrackerContextMock.mockReturnValue(null);
  });

  it("milestone() is a silent no-op - no throw, nothing enqueued", () => {
    const { result } = renderHook(() => useTrack());

    expect(() =>
      result.current.milestone("signed_up", { plan: "pro" }),
    ).not.toThrow();
  });

  it("step() is a silent no-op - no throw, nothing enqueued", () => {
    const { result } = renderHook(() => useTrack());

    expect(() => result.current.step("clicked_cta")).not.toThrow();
  });
});

describe("useTrack props cap (capProps, 2048 char serialized limit)", () => {
  function mockContext() {
    const enqueueMock = vi.fn();
    useGtmTrackerContextMock.mockReturnValue({
      queue: { enqueue: enqueueMock } as unknown as GtmTrackerContextValue["queue"],
      demoSlug: "wallet",
    });
    return enqueueMock;
  }

  it("drops oversized props with a console.debug, but still emits the event", () => {
    const enqueueMock = mockContext();
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const { result } = renderHook(() => useTrack());
    const oversizedProps = { blob: "x".repeat(3000) };
    expect(JSON.stringify(oversizedProps).length).toBeGreaterThan(2048);

    expect(() =>
      result.current.milestone("checkout_complete", oversizedProps),
    ).not.toThrow();

    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const event = enqueueMock.mock.calls[0]![0];
    expect(event.type).toBe("milestone");
    expect(event.name).toBe("checkout_complete");
    expect(event.props).toBeUndefined();
  });

  it("keeps props under the cap untouched and does not call console.debug", () => {
    const enqueueMock = mockContext();
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const { result } = renderHook(() => useTrack());
    result.current.milestone("checkout_complete", { plan: "pro" });

    expect(debugSpy).not.toHaveBeenCalled();
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const event = enqueueMock.mock.calls[0]![0];
    expect(event.props).toEqual({ plan: "pro" });
  });

  it("step() also enqueues props - e.g. a catalog demo_launch event", () => {
    const enqueueMock = mockContext();

    const { result } = renderHook(() => useTrack());
    result.current.step("demo_launch", { demo: "wallet" });

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const event = enqueueMock.mock.calls[0]![0];
    expect(event.type).toBe("step");
    expect(event.name).toBe("demo_launch");
    expect(event.props).toEqual({ demo: "wallet" });
  });

  it("drops non-serializable props (circular reference) silently, still emits the event", () => {
    const enqueueMock = mockContext();
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const { result } = renderHook(() => useTrack());
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() =>
      result.current.milestone("checkout_complete", circular),
    ).not.toThrow();

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const event = enqueueMock.mock.calls[0]![0];
    expect(event.props).toBeUndefined();
    // JSON.stringify throws before the length check ever runs, so the
    // oversized-props console.debug path is never reached here.
    expect(debugSpy).not.toHaveBeenCalled();
  });
});
