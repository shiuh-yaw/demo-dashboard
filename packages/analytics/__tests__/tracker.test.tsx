import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventQueueMeta, EventQueueOptions } from "../src/queue";
import { GtmTracker } from "../src/tracker";

let currentPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

const { enqueueMock, destroyMock, constructedOptions } = vi.hoisted(() => {
  return {
    enqueueMock: vi.fn(),
    destroyMock: vi.fn(),
    constructedOptions: [] as EventQueueOptions[],
  };
});

vi.mock("../src/queue", () => {
  return {
    EventQueue: vi.fn().mockImplementation((options: EventQueueOptions) => {
      constructedOptions.push(options);
      return {
        enqueue: enqueueMock,
        destroy: destroyMock,
        flush: vi.fn(),
      };
    }),
  };
});

const ORIGINAL_TRACK_URL = process.env.NEXT_PUBLIC_TRACK_URL;

function clearCookies() {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; max-age=0; path=/`;
  });
}

function getCookie(name: string): string | undefined {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

function currentMeta(): EventQueueMeta {
  expect(constructedOptions.length).toBeGreaterThan(0);
  const options = constructedOptions[constructedOptions.length - 1]!;
  return options.getMeta();
}

beforeEach(() => {
  currentPathname = "/";
  window.history.pushState({}, "", "/");
  clearCookies();
  window.sessionStorage.clear();
  enqueueMock.mockClear();
  destroyMock.mockClear();
  constructedOptions.length = 0;
  process.env.NEXT_PUBLIC_TRACK_URL = "https://track.example.com";
});

afterEach(() => {
  process.env.NEXT_PUBLIC_TRACK_URL = ORIGINAL_TRACK_URL;
  // Note: deliberately not vi.restoreAllMocks() here - the EventQueue mock is
  // a plain vi.fn().mockImplementation(...) (not a vi.spyOn), so "restore"
  // clears its implementation instead of restoring anything, breaking every
  // subsequent test in this file. mockClear() in beforeEach is enough.
});

describe("GtmTracker", () => {
  it("renders children without throwing", () => {
    expect(() =>
      render(
        <GtmTracker demoSlug="wallet">
          <div data-testid="child">hello</div>
        </GtmTracker>,
      ),
    ).not.toThrow();
  });

  it("is a no-op when NEXT_PUBLIC_TRACK_URL is unset - no throw, queue gets undefined trackUrl", () => {
    delete process.env.NEXT_PUBLIC_TRACK_URL;
    expect(() =>
      render(
        <GtmTracker demoSlug="wallet">
          <div>child</div>
        </GtmTracker>,
      ),
    ).not.toThrow();
    expect(constructedOptions.length).toBe(1);
    expect(constructedOptions[0]!.trackUrl).toBeUndefined();
  });

  it("ensures dd_anon cookie on mount", () => {
    render(<GtmTracker demoSlug="wallet" />);
    const anon = getCookie("dd_anon");
    expect(anon).toBeTruthy();
    expect(anon).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("reads ?share= into dd_share cookie and carries it in batch meta", () => {
    window.history.pushState({}, "", "/?share=tok_abc123");
    render(<GtmTracker demoSlug="wallet" />);

    expect(getCookie("dd_share")).toBe("tok_abc123");
    expect(currentMeta().shareToken).toBe("tok_abc123");
  });

  it("reads ?internal=1 into dd_internal cookie and carries it in batch meta", () => {
    window.history.pushState({}, "", "/?internal=1");
    render(<GtmTracker demoSlug="wallet" />);

    expect(getCookie("dd_internal")).toBe("1");
    expect(currentMeta().isInternal).toBe(true);
  });

  it("emits an initial pageview on mount", () => {
    currentPathname = "/home";
    render(<GtmTracker demoSlug="wallet" />);

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const event = enqueueMock.mock.calls[0]![0];
    expect(event.type).toBe("pageview");
    expect(event.path).toBe("/home");
  });

  it("emits a new pageview on path change", () => {
    currentPathname = "/home";
    const { rerender } = render(<GtmTracker demoSlug="wallet" />);
    expect(enqueueMock).toHaveBeenCalledTimes(1);

    currentPathname = "/wallet/send";
    act(() => {
      rerender(<GtmTracker demoSlug="wallet" />);
    });

    expect(enqueueMock).toHaveBeenCalledTimes(2);
    const event = enqueueMock.mock.calls[1]![0];
    expect(event.type).toBe("pageview");
    expect(event.path).toBe("/wallet/send");
  });

  it("does not re-emit a pageview when the path is unchanged across rerenders", () => {
    currentPathname = "/home";
    const { rerender } = render(<GtmTracker demoSlug="wallet" />);
    expect(enqueueMock).toHaveBeenCalledTimes(1);

    act(() => {
      rerender(<GtmTracker demoSlug="wallet" />);
    });

    expect(enqueueMock).toHaveBeenCalledTimes(1);
  });

  it("destroys the queue on unmount", () => {
    const { unmount } = render(<GtmTracker demoSlug="wallet" />);
    unmount();
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });
});
