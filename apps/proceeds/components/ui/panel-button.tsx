import type { ReactNode } from "react";
import Link from "next/link";

const PANEL_BUTTON_CLASS =
  "inline-flex items-center gap-1.5 text-[13px] font-medium text-(--widget-fg) bg-(--widget-bg) border border-(--widget-input-border) rounded-lg px-3 py-1.5 hover:bg-(--widget-row-bg) transition-colors no-underline disabled:opacity-50 disabled:cursor-default";

export interface PanelButtonProps {
  icon?: ReactNode;
  label: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}

/**
 * Outlined secondary button used in the action bar of panel headers
 * (View transactions / Transfer / Add funds). Same visual as the
 * outlined iOS control Apple uses in the App Store Connect toolbar.
 */
export function PanelButton({
  icon,
  label,
  onClick,
  disabled,
  type = "button",
}: PanelButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={PANEL_BUTTON_CLASS}
    >
      {icon}
      {label}
    </button>
  );
}

export interface PanelLinkButtonProps {
  icon?: ReactNode;
  label: ReactNode;
  href: string;
}

/** Link-rendered variant of PanelButton that uses Next.js client navigation. */
export function PanelLinkButton({
  icon,
  label,
  href,
}: PanelLinkButtonProps) {
  return (
    <Link href={href} className={PANEL_BUTTON_CLASS}>
      {icon}
      {label}
    </Link>
  );
}
