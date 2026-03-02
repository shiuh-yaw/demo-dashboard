"use client";

import * as React from "react";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@dynamic-demos/utils";

export interface AlertProps {
  title: string;
  message: string;
  type?: "error" | "warning" | "info";
  onDismiss?: () => void;
  className?: string;
}

export function Alert({
  title,
  message,
  type = "error",
  onDismiss,
  className,
}: AlertProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 p-3 rounded-lg",
        type === "error"
          ? "bg-red-50 border border-red-100"
          : type === "warning"
          ? "bg-amber-50 border border-amber-100"
          : "bg-blue-50 border border-blue-100",
        className
      )}
    >
      <AlertCircle
        className={cn(
          "w-4 h-4 shrink-0 mt-0.5",
          type === "error"
            ? "text-red-500"
            : type === "warning"
            ? "text-amber-500"
            : "text-blue-500"
        )}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-xs font-medium",
            type === "error"
              ? "text-red-800"
              : type === "warning"
              ? "text-amber-800"
              : "text-blue-800"
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            "text-[11px] mt-0.5 leading-tight",
            type === "error"
              ? "text-red-600"
              : type === "warning"
              ? "text-amber-600"
              : "text-blue-600"
          )}
        >
          {message}
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            "shrink-0 p-0.5 rounded hover:opacity-70",
            type === "error"
              ? "text-red-400"
              : type === "warning"
              ? "text-amber-400"
              : "text-blue-400"
          )}
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
