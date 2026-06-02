"use client";

import { useCallback, useRef, useState } from "react";
import {
  detectScanEngine,
  type BarcodeDetectorCtor,
} from "@/lib/qr/scan-engine";

export type ScannerStatus =
  | "idle"
  | "starting"
  | "scanning"
  | "denied"
  | "unsupported"
  | "error";

interface UseQrScannerOptions {
  /** Called with the raw decoded string for every successful decode. */
  onResult: (text: string) => void;
}

/**
 * Owns the camera stream and QR decode loop for the scanner modal.
 *
 * Strategy: native BarcodeDetector when available, else lazy-import
 * @zxing/browser. The caller renders <video ref={videoRef} />, calls start()
 * when its modal opens, and stop() on close/unmount.
 */
export function useQrScanner({ onResult }: UseQrScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("idle");

  // Keep the latest onResult without making start() unstable.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // Teardown for whatever engine is currently running.
  const cleanupRef = useRef<() => void>(() => {});

  const stop = useCallback(() => {
    cleanupRef.current();
    cleanupRef.current = () => {};
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      setStatus("error");
      return;
    }

    // Camera requires a secure context (https/localhost) and the API present.
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    setStatus("starting");

    try {
      if (detectScanEngine(window) === "native") {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        video.srcObject = stream;
        await video.play();

        const Ctor = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor })
          .BarcodeDetector;
        const detector = new Ctor({ formats: ["qr_code"] });

        let raf = 0;
        let stopped = false;
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video);
            const value = codes[0]?.rawValue;
            if (value) onResultRef.current(value);
          } catch {
            // Transient per-frame decode error — ignore and keep scanning.
          }
          raf = requestAnimationFrame(tick);
        };

        cleanupRef.current = () => {
          stopped = true;
          cancelAnimationFrame(raf);
          stream.getTracks().forEach((t) => t.stop());
          video.srcObject = null;
        };

        setStatus("scanning");
        raf = requestAnimationFrame(tick);
        return;
      }

      // Fallback: @zxing/browser drives its own getUserMedia.
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        video,
        (result) => {
          if (result) onResultRef.current(result.getText());
        },
      );

      cleanupRef.current = () => {
        controls.stop();
        const stream = video.srcObject as MediaStream | null;
        stream?.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      };

      setStatus("scanning");
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setStatus("denied");
      } else {
        // NotFoundError (no camera), zxing import failure, play() rejection, etc.
        setStatus("error");
      }
    }
  }, []);

  return { videoRef, status, start, stop };
}
