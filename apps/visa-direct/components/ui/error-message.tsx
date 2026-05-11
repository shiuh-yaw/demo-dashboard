"use client";

import { AlertCircle } from "lucide-react";
import { parseError } from "@/lib/get-error-message";
import { cn } from "@dynamic-demos/utils";

interface ErrorMessageProps {
  error: unknown;
  defaultMessage?: string;
  className?: string;
}

export function ErrorMessage({
  error,
  defaultMessage,
  className,
}: ErrorMessageProps) {
  if (!error) return null;

  const { title, description } = parseError(error, defaultMessage);

  if (!title) return null;

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-(--brand-radius) border border-(--brand-error)/30 bg-(--brand-status-failed-bg)",
        className,
      )}
    >
      <AlertCircle className="w-5 h-5 text-(--brand-error) flex-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-(--brand-error)">{title}</p>
        {description && (
          <p className="text-xs text-(--brand-error)/80 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}
