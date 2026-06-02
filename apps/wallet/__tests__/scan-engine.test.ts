import { describe, it, expect } from "vitest";
import { detectScanEngine } from "../lib/qr/scan-engine";

describe("detectScanEngine", () => {
  it("returns 'native' when BarcodeDetector exists on the window", () => {
    const win = { BarcodeDetector: class {} } as unknown as Window;
    expect(detectScanEngine(win)).toBe("native");
  });

  it("returns 'fallback' when BarcodeDetector is absent", () => {
    const win = {} as unknown as Window;
    expect(detectScanEngine(win)).toBe("fallback");
  });
});
