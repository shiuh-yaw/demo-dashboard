import type { ReactNode } from "react";

export type LinkButtonTone = "primary" | "success" | "danger" | "muted";

const TONE_COLOR: Record<LinkButtonTone, string> = {
  primary: "var(--widget-primary)",
  success: "var(--widget-success)",
  danger: "var(--widget-error)",
  muted: "var(--widget-muted)",
};

export interface LinkButtonProps {
  children: ReactNode;
  onClick?: () => void;
  tone?: LinkButtonTone;
  disabled?: boolean;
  /** Native button type; defaults to "button" so it never triggers form submit. */
  type?: "button" | "submit";
}

/**
 * Text-only button styled like a hyperlink. Used for inline actions in
 * definition-list rows (Copy / Change / Set up / Remove).
 */
export function LinkButton({
  children,
  onClick,
  tone = "primary",
  disabled,
  type = "button",
}: LinkButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="text-[13px] font-medium bg-transparent border-none cursor-pointer p-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-default"
      style={{ color: TONE_COLOR[tone] }}
    >
      {children}
    </button>
  );
}
