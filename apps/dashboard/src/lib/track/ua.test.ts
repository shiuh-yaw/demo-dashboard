import { describe, expect, it } from "vitest";

import { parseUserAgent } from "./ua";

const CHROME_MACOS =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const IOS_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

const IPAD_SAFARI =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const WINDOWS_EDGE =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";

describe("parseUserAgent", () => {
  it("parses Chrome on macOS desktop", () => {
    expect(parseUserAgent(CHROME_MACOS)).toEqual({
      device: "Desktop",
      os: "macOS",
      browser: "Chrome",
    });
  });

  it("parses iOS Safari", () => {
    expect(parseUserAgent(IOS_SAFARI)).toEqual({
      device: "Mobile",
      os: "iOS",
      browser: "Safari",
    });
  });

  it("parses Android Chrome as Mobile", () => {
    expect(parseUserAgent(ANDROID_CHROME)).toEqual({
      device: "Mobile",
      os: "Android",
      browser: "Chrome",
    });
  });

  it("parses iPad as Tablet", () => {
    expect(parseUserAgent(IPAD_SAFARI)).toEqual({
      device: "Tablet",
      os: "iOS",
      browser: "Safari",
    });
  });

  it("parses Edge on Windows, not Chrome", () => {
    expect(parseUserAgent(WINDOWS_EDGE)).toEqual({
      device: "Desktop",
      os: "Windows",
      browser: "Edge",
    });
  });

  it("returns nulls for an unrecognized UA", () => {
    expect(parseUserAgent("SomeRandomBot/3.2")).toEqual({
      device: null,
      os: null,
      browser: null,
    });
  });

  it("returns nulls for empty/missing UA", () => {
    expect(parseUserAgent(null)).toEqual({
      device: null,
      os: null,
      browser: null,
    });
    expect(parseUserAgent(undefined)).toEqual({
      device: null,
      os: null,
      browser: null,
    });
    expect(parseUserAgent("")).toEqual({
      device: null,
      os: null,
      browser: null,
    });
  });
});
