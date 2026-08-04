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

  it("track() is a silent no-op - no throw, nothing enqueued", () => {
    const { result } = renderHook(() => useTrack());

    expect(() => result.current.track("clicked_cta")).not.toThrow();
  });

  it("page() is a silent no-op - no throw, nothing enqueued", () => {
    const { result } = renderHook(() => useTrack());

    expect(() => result.current.page("checkout")).not.toThrow();
  });

  it("identify() is a silent no-op - no throw, nothing enqueued", () => {
    const { result } = renderHook(() => useTrack());

    expect(() =>
      result.current.identify("u_1", { email: "a@b.co" }),
    ).not.toThrow();
  });
});

describe("useTrack props cap (capProps, 2048 char serialized limit)", () => {
  function mockContext() {
    const enqueueMock = vi.fn();
    const setIdentityMock = vi.fn();
    useGtmTrackerContextMock.mockReturnValue({
      queue: {
        enqueue: enqueueMock,
        setIdentity: setIdentityMock,
      } as unknown as GtmTrackerContextValue["queue"],
      demoSlug: "wallet",
    });
    return { enqueueMock, setIdentityMock };
  }

  it("drops oversized props with a console.debug, but still emits the event", () => {
    const { enqueueMock } = mockContext();
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
    const { enqueueMock } = mockContext();
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const { result } = renderHook(() => useTrack());
    result.current.milestone("checkout_complete", { plan: "pro" });

    expect(debugSpy).not.toHaveBeenCalled();
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const event = enqueueMock.mock.calls[0]![0];
    expect(event.props).toEqual({ plan: "pro" });
  });

  it("step() also enqueues props - e.g. a catalog demo_launch event", () => {
    const { enqueueMock } = mockContext();

    const { result } = renderHook(() => useTrack());
    result.current.step("demo_launch", { demo: "wallet" });

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const event = enqueueMock.mock.calls[0]![0];
    expect(event.type).toBe("step");
    expect(event.name).toBe("demo_launch");
    expect(event.props).toEqual({ demo: "wallet" });
  });

  it("drops non-serializable props (circular reference) silently, still emits the event", () => {
    const { enqueueMock } = mockContext();
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

  it("track() emits type:step - the Segment/Amplitude-shaped synonym for step()", () => {
    const { enqueueMock } = mockContext();

    const { result } = renderHook(() => useTrack());
    result.current.track("demo_launch", { demo: "wallet" });

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const event = enqueueMock.mock.calls[0]![0];
    expect(event.type).toBe("step");
    expect(event.name).toBe("demo_launch");
    expect(event.props).toEqual({ demo: "wallet" });
  });

  it("page() emits type:pageview with no name in props when called bare", () => {
    const { enqueueMock } = mockContext();

    const { result } = renderHook(() => useTrack());
    result.current.page();

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const event = enqueueMock.mock.calls[0]![0];
    expect(event.type).toBe("pageview");
    expect(event.props?.name).toBeUndefined();
  });

  it("page(name, props) emits type:pageview with name folded into props", () => {
    const { enqueueMock } = mockContext();

    const { result } = renderHook(() => useTrack());
    result.current.page("checkout", { step: 2 });

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const event = enqueueMock.mock.calls[0]![0];
    expect(event.type).toBe("pageview");
    expect(event.props).toEqual({ step: 2, name: "checkout" });
  });

  it("milestone() still emits type:milestone unchanged", () => {
    const { enqueueMock } = mockContext();

    const { result } = renderHook(() => useTrack());
    result.current.milestone("authenticated", { dynamicUserId: "u_1" });

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const event = enqueueMock.mock.calls[0]![0];
    expect(event.type).toBe("milestone");
    expect(event.name).toBe("authenticated");
  });

  it("identify(id, traits) sets session identity on the queue and enqueues exactly one identify event", () => {
    const { enqueueMock, setIdentityMock } = mockContext();

    const { result } = renderHook(() => useTrack());
    result.current.identify("u_1", { email: "a@b.co", plan: "pro" });

    expect(setIdentityMock).toHaveBeenCalledTimes(1);
    expect(setIdentityMock).toHaveBeenCalledWith({
      userId: "u_1",
      email: "a@b.co",
      traits: { plan: "pro" },
    });

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const event = enqueueMock.mock.calls[0]![0];
    expect(event.type).toBe("identify");
    // batch.identity (set via setIdentity above) is the authoritative
    // carrier - the identify event itself carries no props, so userId/
    // email/traits are never duplicated (and never at risk of re-exceeding
    // the props cap after merging - see the near-boundary test below).
    expect(event.props).toBeUndefined();
  });

  it("identify()'s wire event never carries props, even when there are no traits at all", () => {
    const { enqueueMock } = mockContext();

    const { result } = renderHook(() => useTrack());
    result.current.identify("u_1");

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const event = enqueueMock.mock.calls[0]![0];
    expect(event.type).toBe("identify");
    expect(event.props).toBeUndefined();
  });

  it("identify() traits right at the boundary (individually under cap, but userId+email would have pushed a re-merged props over cap) still enqueue a valid identify event with no props", () => {
    const { enqueueMock, setIdentityMock } = mockContext();
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const { result } = renderHook(() => useTrack());
    // Traits alone comfortably clear the 2048-char props cap...
    const traits = { blob: "x".repeat(2010) };
    expect(JSON.stringify(traits).length).toBeLessThan(2048);
    // ...but merged with userId + email, the combined object would have
    // exceeded 2048 if it were ever re-merged into the identify event's
    // props (it no longer is - see use-track.ts).
    const combinedLength = JSON.stringify({
      userId: "u_1",
      email: "a@b.co",
      ...traits,
    }).length;
    expect(combinedLength).toBeGreaterThan(2048);

    result.current.identify("u_1", { email: "a@b.co", ...traits });

    // Traits alone are under cap, so setIdentity keeps them - no drop, no
    // console.debug.
    expect(debugSpy).not.toHaveBeenCalled();
    expect(setIdentityMock).toHaveBeenCalledWith({
      userId: "u_1",
      email: "a@b.co",
      traits,
    });

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const event = enqueueMock.mock.calls[0]![0];
    expect(event.type).toBe("identify");
    expect(event.props).toBeUndefined();
  });

  it("identify() drops an oversized email client-side (>320 chars), mirroring the server's identitySchema cap", () => {
    const { setIdentityMock } = mockContext();

    const { result } = renderHook(() => useTrack());
    const oversizedEmail = `${"a".repeat(316)}@b.co`; // 321 chars, > 320
    expect(oversizedEmail.length).toBeGreaterThan(320);

    result.current.identify("u_1", { email: oversizedEmail, plan: "pro" });

    expect(setIdentityMock).toHaveBeenCalledWith({
      userId: "u_1",
      traits: { plan: "pro" },
    });
  });

  it("identify() keeps an email right at the 320-char boundary", () => {
    const { setIdentityMock } = mockContext();

    const { result } = renderHook(() => useTrack());
    const boundaryEmail = `${"a".repeat(315)}@b.co`; // exactly 320 chars
    expect(boundaryEmail.length).toBe(320);

    result.current.identify("u_1", { email: boundaryEmail });

    expect(setIdentityMock).toHaveBeenCalledWith({
      userId: "u_1",
      email: boundaryEmail,
    });
  });

  it("identify(id) without traits sets identity with no email/traits keys", () => {
    const { setIdentityMock } = mockContext();

    const { result } = renderHook(() => useTrack());
    result.current.identify("u_1");

    expect(setIdentityMock).toHaveBeenCalledWith({ userId: "u_1" });
  });

  it("identify() traits are capped like other props - oversized traits are dropped silently", () => {
    const { enqueueMock, setIdentityMock } = mockContext();
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const { result } = renderHook(() => useTrack());
    const oversized = { blob: "x".repeat(3000) };

    expect(() =>
      result.current.identify("u_1", { email: "a@b.co", ...oversized }),
    ).not.toThrow();

    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(setIdentityMock).toHaveBeenCalledWith({
      userId: "u_1",
      email: "a@b.co",
    });
    expect(enqueueMock).toHaveBeenCalledTimes(1);
  });

  it("identify() drops non-serializable traits (circular reference) silently", () => {
    const { setIdentityMock } = mockContext();
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const { result } = renderHook(() => useTrack());
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => result.current.identify("u_1", circular)).not.toThrow();

    expect(setIdentityMock).toHaveBeenCalledWith({ userId: "u_1" });
    expect(debugSpy).not.toHaveBeenCalled();
  });
});
