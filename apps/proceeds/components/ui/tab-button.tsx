import type { ReactNode } from "react";

export interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  /** Accessible id for the associated tabpanel, enabling `aria-controls`. */
  controls?: string;
  /** Id of this tab so the panel can reference it via `aria-labelledby`. */
  id?: string;
}

/**
 * App Store Connect-style underlined tab. Renders as `role="tab"` so the
 * caller can wrap it in a `role="tablist"` for a proper a11y tree.
 */
export function TabButton({
  active,
  onClick,
  children,
  controls,
  id,
}: TabButtonProps) {
  return (
    <button
      id={id}
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className="relative text-[14px] font-medium pb-3 -mb-px transition-colors"
      style={{
        color: active ? "var(--widget-fg)" : "var(--widget-muted)",
        borderBottom: active
          ? "2px solid var(--widget-primary)"
          : "2px solid transparent",
      }}
    >
      {children}
    </button>
  );
}
