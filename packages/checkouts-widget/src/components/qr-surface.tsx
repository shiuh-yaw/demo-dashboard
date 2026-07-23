"use client";

import { QRCodeSVG } from "qrcode.react";

export interface QrSurfaceProps {
  /** String encoded into the QR code. */
  value: string;
  /** Heading shown above the QR, next to the optional icon. */
  title: string;
  /** Optional 28x28 icon rendered beside the title. */
  iconUrl?: string;
  /** Helper text under the QR. */
  caption: string;
  onBack: () => void;
  backLabel: string;
}

/**
 * Brand-token QR card: back button, icon + title, white QR tile,
 * caption. QR tile stays white in dark mode so scanners keep contrast.
 */
export function QrSurface({
  value,
  title,
  iconUrl,
  caption,
  onBack,
  backLabel,
}: QrSurfaceProps) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 self-start cursor-pointer text-[11px] font-medium text-(--brand-muted) hover:text-(--brand-fg) transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden
          className="block"
        >
          <path
            d="M11 7H1m0 0l4-4M1 7l4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {backLabel}
      </button>

      <div className="flex flex-col items-center gap-3 rounded-2xl bg-(--brand-row-bg) px-5 py-6">
        <div className="flex items-center gap-2.5">
          {iconUrl && (
            <img
              src={iconUrl}
              alt=""
              className="h-7 w-7 rounded-lg object-contain bg-(--brand-surface)"
            />
          )}
          <span className="text-[15px] font-semibold text-(--brand-fg)">
            {title}
          </span>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <QRCodeSVG
            value={value}
            size={208}
            level="M"
            marginSize={0}
            bgColor="#ffffff"
            fgColor="#0E121B"
          />
        </div>

        <p className="text-[13px] text-(--brand-fg-secondary) text-center max-w-[28ch]">
          {caption}
        </p>
      </div>
    </div>
  );
}
