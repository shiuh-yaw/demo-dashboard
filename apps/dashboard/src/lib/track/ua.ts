/**
 * Minimal zero-dependency User-Agent parser for the ingest route.
 *
 * Decision: no `ua-parser-js` dependency. The tracker only needs a coarse
 * device/os/browser bucket for analytics display, not exhaustive UA
 * coverage - a small ordered regex chain covers the browsers this
 * platform's demo traffic actually sees (Chrome/Edge/Firefox/Safari/Opera
 * across Windows/macOS/iOS/Android/Linux) without adding a dependency to
 * a hot, public, unauthenticated route.
 */

export type Device = "Desktop" | "Mobile" | "Tablet";

export interface ParsedUserAgent {
  device: Device | null;
  os: string | null;
  browser: string | null;
}

function classifyDevice(ua: string): Device | null {
  if (/iPad/i.test(ua)) return "Tablet";
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "Mobile" : "Tablet";
  if (/iPhone|iPod|Mobi/i.test(ua)) return "Mobile";
  if (/Windows NT|Macintosh|Mac OS X|X11|Linux/i.test(ua)) return "Desktop";
  return null;
}

function classifyOs(ua: string): string | null {
  if (/Windows NT/i.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Linux/i.test(ua)) return "Linux";
  return null;
}

function classifyBrowser(ua: string): string | null {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua)) return "Opera";
  if (/FxiOS\//i.test(ua) || /Firefox\//i.test(ua)) return "Firefox";
  if (/CriOS\//i.test(ua) || /Chrome\//i.test(ua)) return "Chrome";
  if (/Version\/[\d.]+.*Safari\//i.test(ua)) return "Safari";
  return null;
}

/** Nulls out every field for empty/unrecognized input - never throws. */
export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) return { device: null, os: null, browser: null };
  return {
    device: classifyDevice(ua),
    os: classifyOs(ua),
    browser: classifyBrowser(ua),
  };
}
