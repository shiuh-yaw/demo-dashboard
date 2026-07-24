import { describe, it, expect } from "vitest";

import {
  ONBOARDING_SEEN_COOKIE,
  ONBOARDING_SEEN_COOKIE_MAX_AGE,
  ONBOARDING_WELCOME_PATH,
  onboardingSeenCookieOptions,
  getOnboardingSeen,
  shouldRedirectToOnboarding,
  parseTheme,
} from "../operator-prefs";

describe("ONBOARDING_SEEN_COOKIE", () => {
  it("uses the documented cookie name", () => {
    expect(ONBOARDING_SEEN_COOKIE).toBe("onboarding_seen");
  });

  it("sets a ~1 year maxAge, httpOnly, sameSite=lax, path=/", () => {
    expect(ONBOARDING_SEEN_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
    expect(onboardingSeenCookieOptions).toMatchObject({
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  });
});

describe("getOnboardingSeen", () => {
  it("is false when the cookie is absent (first run)", () => {
    expect(getOnboardingSeen(undefined)).toBe(false);
  });

  it("is true once the cookie has any value", () => {
    expect(getOnboardingSeen("true")).toBe(true);
  });
});

describe("parseTheme", () => {
  it("defaults to 'auto' (follow the OS) when nothing is stored", () => {
    expect(parseTheme(undefined)).toBe("auto");
    expect(parseTheme("bogus")).toBe("auto");
  });

  it("honors an explicit stored light/dark/auto choice", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("auto")).toBe("auto");
  });
});

describe("shouldRedirectToOnboarding", () => {
  it("redirects a first-run browser (cookie absent) on any other path", () => {
    expect(shouldRedirectToOnboarding(undefined, "/dashboard")).toBe(true);
    expect(shouldRedirectToOnboarding(undefined, null)).toBe(true);
  });

  it("does not redirect when already on the welcome route", () => {
    expect(shouldRedirectToOnboarding(undefined, ONBOARDING_WELCOME_PATH)).toBe(
      false,
    );
  });

  it("does not redirect once the cookie is set, regardless of path", () => {
    expect(shouldRedirectToOnboarding("true", "/dashboard")).toBe(false);
    expect(shouldRedirectToOnboarding("true", null)).toBe(false);
  });
});
