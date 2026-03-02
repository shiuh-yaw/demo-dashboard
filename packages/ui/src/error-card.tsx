"use client";

import type { ReactNode } from "react";
import { WidgetCard } from "./widget-card";
import { Button } from "./button";

/** Alert circle icon */
function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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

/** Arrow left icon */
function ArrowLeftIcon({ className }: { className?: string }) {
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
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

export interface ErrorCardProps {
  /** Optional custom icon (defaults to AlertCircle) */
  icon?: ReactNode;
  /** Card title (defaults to "Error") */
  title?: string;
  /** Error message string */
  message?: string;
  /** Error object (alternative to message) */
  error?: Error | null;
  /** Called when close/back button is clicked */
  onClose?: () => void;
  /** Show back button (default true) */
  showBackButton?: boolean;
  /** Back button text (default "Back") */
  backButtonText?: string;
}

/**
 * Reusable error state card for widget UIs
 */
export function ErrorCard({
  icon,
  title = "Error",
  message,
  error,
  onClose,
  showBackButton = true,
  backButtonText = "Back",
}: ErrorCardProps) {
  const defaultIcon = (
    <AlertCircleIcon className="w-[18px] h-[18px] text-(--widget-error)" />
  );

  const errorMessage = message || error?.message;

  return (
    <WidgetCard icon={icon ?? defaultIcon} title={title} onClose={onClose}>
      <div className="space-y-4">
        {errorMessage && (
          <p className="text-sm text-(--widget-error)">{errorMessage}</p>
        )}
        {showBackButton && onClose && (
          <Button variant="secondary" className="w-full" onClick={onClose}>
            <ArrowLeftIcon className="w-4 h-4" />
            {backButtonText}
          </Button>
        )}
      </div>
    </WidgetCard>
  );
}
