"use client";

/**
 * Small text button below a scenario widget that clears the sticky
 * theme cookie - identical across wallet / earn / trade before it was
 * promoted here. Navigating with an empty `?theme=` makes the demo
 * middleware delete the app's config cookie, so the page re-renders in
 * the default Dynamic chrome. Apps keep a thin wrapper that reads
 * their config context and passes `active`.
 */

export function ResetThemeButton({
  active,
  variant = "block",
}: {
  active: boolean;
  /**
   * "block" (default): centered text-xs row below a widget.
   * "link": bare button styled like a SiteFooter link - pass via the
   * footer's `extraLinks` slot.
   */
  variant?: "block" | "link";
}) {
  // Nothing to clear when no branded config is active.
  if (!active) return null;

  const button = (
    <button
      type="button"
      // Full document navigation on purpose: the middleware must run to
      // delete the cookie, and the root layout (theme <style>) must
      // re-render — client-side routing guarantees neither.
      onClick={() => window.location.assign("/?theme=")}
      className={
        variant === "link"
          ? "text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          : "text-xs text-(--brand-muted) transition-colors hover:text-(--brand-fg)"
      }
    >
      {/* The footer-links placement reads better terse. */}
      {variant === "link" ? "Clear" : "Clear theme"}
    </button>
  );

  if (variant === "link") return button;
  return <div className="mt-3 text-center">{button}</div>;
}
