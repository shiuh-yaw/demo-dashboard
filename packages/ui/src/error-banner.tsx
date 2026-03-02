"use client";

import { cn } from "@dynamic-demos/utils";

/** Alert circle icon */
function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

/** Close icon */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export type ErrorBannerType = "error" | "warning" | "info";

export interface ErrorBannerProps {
  /** Title of the error/warning */
  title?: string;
  /** Message content */
  message: string;
  /** Type determines color scheme */
  type?: ErrorBannerType;
  /** Dismiss callback - if provided, shows X button */
  onDismiss?: () => void;
  /** Additional class names */
  className?: string;
}

const TYPE_STYLES: Record<
  ErrorBannerType,
  { bg: string; border: string; text: string; icon: string }
> = {
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    icon: "text-red-500",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: "text-amber-500",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: "text-blue-500",
  },
};

/**
 * Dismissible error/warning/info banner.
 * Used for displaying errors in forms or screens.
 */
function ErrorBanner({
  title,
  message,
  type = "error",
  onDismiss,
  className,
}: ErrorBannerProps) {
  const styles = TYPE_STYLES[type];

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        styles.bg,
        styles.border,
        className
      )}
      role="alert"
    >
      <AlertCircleIcon className={cn("w-4 h-4 mt-0.5 shrink-0", styles.icon)} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn("text-sm font-medium", styles.text)}>{title}</p>
        )}
        <p className={cn("text-sm", styles.text, title && "mt-0.5")}>
          {message}
        </p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            "shrink-0 p-1 rounded hover:bg-black/5 transition-colors cursor-pointer",
            styles.text
          )}
          aria-label="Dismiss"
        >
          <XIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export { ErrorBanner };
