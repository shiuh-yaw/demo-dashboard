"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import { parseError } from "@/lib/get-error-message";

/** Inline error card. Renders nothing for a falsy or empty error. */
export function ErrorMessage({
  error,
  defaultMessage,
  className,
}: {
  error: unknown;
  defaultMessage?: string;
  className?: string;
}) {
  if (!error) return null;

  const { title, description } = parseError(error, defaultMessage);
  if (!title) return null;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-(--brand-radius) border border-red-200 bg-red-50 p-3",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-(--brand-error)" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-(--brand-error)">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-red-600/80">{description}</p>
        )}
      </div>
    </div>
  );
}
