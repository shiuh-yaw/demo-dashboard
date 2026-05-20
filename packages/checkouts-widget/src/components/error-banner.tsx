"use client";

/**
 * ErrorBanner
 *
 * Dismissible error/warning banner used across wallet connection screens.
 */

import { AlertCircle, X } from "lucide-react";
import { cn } from "@dynamic-demos/utils";

export interface ErrorInfo {
  title: string;
  message: string;
  type: "error" | "warning";
}

interface ErrorBannerProps {
  error: ErrorInfo | null;
  onDismiss: () => void;
}

export default function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  if (!error) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 p-2.5 rounded-(--brand-radius) mb-1.5",
        error.type === "error"
          ? "bg-red-50 border border-red-100"
          : "bg-amber-50 border border-amber-100",
      )}
    >
      <AlertCircle
        className={cn(
          "w-4 h-4 shrink-0 mt-0.5",
          error.type === "error" ? "text-red-500" : "text-amber-500",
        )}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-xs font-medium",
            error.type === "error" ? "text-red-800" : "text-amber-800",
          )}
        >
          {error.title}
        </p>
        <p
          className={cn(
            "text-[11px] mt-0.5 leading-tight",
            error.type === "error" ? "text-red-600" : "text-amber-600",
          )}
        >
          {error.message}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className={cn(
          "shrink-0 p-0.5 rounded hover:opacity-70",
          error.type === "error" ? "text-red-400" : "text-amber-400",
        )}
        aria-label="Dismiss error"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
