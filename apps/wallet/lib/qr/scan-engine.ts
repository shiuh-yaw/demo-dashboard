/**
 * QR scan engine selection + minimal ambient types for the browser-native
 * BarcodeDetector API (not yet in TypeScript's DOM lib).
 */

export type ScanEngine = "native" | "fallback";

/** Shape of a detected barcode we care about. */
export interface DetectedBarcode {
  rawValue: string;
}

/** Minimal interface for a BarcodeDetector instance. */
export interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

/** Minimal interface for the BarcodeDetector constructor. */
export interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
}

/**
 * Choose the QR decode engine for the current browser:
 * - "native"   → window.BarcodeDetector is present (Chrome, Safari 17+)
 * - "fallback" → use @zxing/browser (e.g. Firefox)
 */
export function detectScanEngine(win: Window): ScanEngine {
  return "BarcodeDetector" in win ? "native" : "fallback";
}
