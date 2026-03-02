"use client";

/**
 * InfoBox
 *
 * Gradient info box with optional icon and message text.
 * Used in chain selection and WalletConnect flow screens.
 */

interface InfoBoxProps {
  /** Icon URL to display */
  iconUrl?: string;
  /** Alt text for the icon */
  iconAlt?: string;
  /** Message text */
  message: string;
}

export default function InfoBox({ iconUrl, iconAlt, message }: InfoBoxProps) {
  return (
    <div className="bg-linear-to-b from-(--widget-gradient-from) to-(--widget-gradient-to) rounded-(--widget-radius) p-3">
      <div className="flex flex-col items-center gap-1.5">
        {iconUrl && (
          <div className="w-7 h-7 shrink-0">
            <img
              src={iconUrl}
              alt={iconAlt || ""}
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <p className="text-xs text-(--widget-muted) text-center tracking-[-0.12px] leading-4">
          {message}
        </p>
      </div>
    </div>
  );
}
