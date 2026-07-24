"use client";

/**
 * Bottom-centered save bar with a single morphing pill: idle (Unsaved changes /
 * Reset / Save) animates into a Saving state, then either a brief Saved
 * confirmation before it dismisses, or an inline Error state (Reset / Try
 * again) if the save failed - failures never raise a toast, they render here.
 * The parent owns `dirty` + `saving` + `error`; the Saved flash is derived
 * from the saving edge with no error and no remaining dirt, so it fires only
 * on a real completion. Error takes priority over idle: a failed save keeps
 * the form dirty (so idle would otherwise show), but the bar must keep
 * surfacing the failure until the user resets or a fresh save clears it.
 * The pill's width is measured per-state (via ref) and applied to the outer
 * chrome as an explicit CSS transition, so switching between idle/saving/
 * saved/error morphs its size instead of hard-snapping; the inner content
 * cross-fades in with `animate-in`. Both honor `motion-reduce`.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertCircle, Check, Info, Loader2 } from "lucide-react";
import { cn } from "@dynamic-demos/utils";

export interface SaveBarProps {
  /** Live form differs from the last saved snapshot. */
  dirty: boolean;
  /** A save promise is in flight. */
  saving: boolean;
  /** Set when the last save attempt failed; shows an inline error instead of a toast. Cleared by the parent on a new save/edit/reset. */
  error?: string | null;
  onSave: () => void;
  onReset: () => void;
  label?: string;
}

export function SaveBar({
  dirty,
  saving,
  error = null,
  onSave,
  onReset,
  label = "Unsaved changes",
}: SaveBarProps) {
  const [saved, setSaved] = useState(false);
  const wasSaving = useRef(false);

  // Saved flash fires only on the saving -> done edge with no remaining dirt
  // and no error (a failed save stays dirty and reports via `error`, so it
  // never shows a false confirmation).
  useEffect(() => {
    if (wasSaving.current && !saving && !dirty && !error) {
      setSaved(true);
      wasSaving.current = saving;
      const t = setTimeout(() => setSaved(false), 1600);
      return () => clearTimeout(t);
    }
    wasSaving.current = saving;
  }, [saving, dirty, error]);

  // Belt-and-suspenders: an error arriving mid-flash clears the confirmation
  // immediately rather than letting a stale "Saved" linger.
  useEffect(() => {
    if (error) setSaved(false);
  }, [error]);

  // "hidden" (not dirty, not saving, not saved, not errored) renders no
  // content so the post-save exit fade never flashes the idle
  // "Unsaved changes" block. Error outranks idle since a failed save leaves
  // `dirty` true.
  const state = saving
    ? "saving"
    : error
      ? "error"
      : saved
        ? "saved"
        : dirty
          ? "idle"
          : "hidden";
  const visible = dirty || saving || saved || Boolean(error);

  const contentRef = useRef<HTMLDivElement>(null);
  const [pillWidth, setPillWidth] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setPillWidth(el.offsetWidth);
  }, [state, label, error]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ease-out motion-reduce:transition-none",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-8 opacity-0",
      )}
    >
      <div
        style={pillWidth !== undefined ? { width: pillWidth } : undefined}
        className="overflow-hidden rounded-xl bg-zinc-900 shadow-[var(--shadow-elevated)] transition-[width] duration-300 ease-out will-change-[width] motion-reduce:transition-none dark:bg-zinc-100"
      >
        <div ref={contentRef} className="flex w-max items-center gap-3 py-2 pl-4 pr-2">
          {state === "idle" && (
            <div
              key="idle"
              className="flex items-center gap-3 duration-200 animate-in fade-in-0 motion-reduce:animate-none"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-white dark:text-zinc-900">
                <Info className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                {label}
              </span>
              <button
                type="button"
                onClick={onReset}
                className="cursor-pointer rounded-lg px-2 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:text-white dark:text-zinc-500 dark:hover:text-zinc-900"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={onSave}
                className="cursor-pointer rounded-lg bg-action px-3 py-1.5 text-[13px] font-medium text-white shadow-[var(--shadow-button)] transition-[filter] hover:brightness-110"
              >
                Save changes
              </button>
            </div>
          )}
          {state === "saving" && (
            <div
              key="saving"
              className="flex items-center gap-2 py-0.5 pr-2 duration-200 animate-in fade-in-0 motion-reduce:animate-none"
            >
              <Loader2 className="h-4 w-4 animate-spin text-white dark:text-zinc-800" />
              <span className="text-[13px] font-medium text-white dark:text-zinc-800">
                Saving...
              </span>
            </div>
          )}
          {state === "saved" && (
            <div
              key="saved"
              className="flex items-center gap-2 py-0.5 pr-2 duration-200 animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none"
            >
              <Check className="h-4 w-4 text-green-400 dark:text-green-600" />
              <span className="text-[13px] font-medium text-white dark:text-zinc-800">
                Saved
              </span>
            </div>
          )}
          {state === "error" && (
            <div
              key="error"
              className="flex items-center gap-3 duration-200 animate-in fade-in-0 motion-reduce:animate-none"
            >
              <span className="flex max-w-[280px] items-center gap-2 text-[13px] font-medium text-red-400 dark:text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 dark:text-red-600" />
                <span className="truncate">{error}</span>
              </span>
              <button
                type="button"
                onClick={onReset}
                className="cursor-pointer rounded-lg px-2 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:text-white dark:text-zinc-500 dark:hover:text-zinc-900"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={onSave}
                className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-medium text-white shadow-[var(--shadow-button)] transition-[filter] hover:brightness-110"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
