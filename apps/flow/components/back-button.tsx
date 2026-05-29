/**
 * "← Back to <X>" link used above the widget surfaces on every
 * scenario route. The label is required so each call site reads as the
 * concrete navigation it performs ("Back to product", "Back to wallet",
 * etc.) — preventing a generic "Back" that obscures intent.
 *
 * Styled as a small muted affordance ahead of the card chrome rather
 * than a button-shaped CTA — it's a navigation hint, not a primary
 * action.
 */

import { ArrowLeft } from "./icons";

export function BackButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 self-start text-[11px] font-medium text-(--brand-muted) transition-colors hover:text-(--brand-fg)"
    >
      <ArrowLeft />
      {label}
    </button>
  );
}
