"use client";

/**
 * Shared header dropdown-menu shell - the pill trigger + right-aligned
 * popover skeleton that earn's UserMenu and trade's ConnectButton each
 * hand-rolled before it was promoted here. The shell owns behavior and
 * geometry (open state, outside-click + Escape close, chevron rotation,
 * popover placement); identity content and rows stay app-owned via
 * slots. Styling rides `--brand-*` tokens only - apps that theme dark
 * (trade) redefine those tokens under `.dark`, so the shell needs no
 * dark-mode classes.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown, PhoneCall } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import { useBookACallHref } from "./book-a-call";

const HeaderMenuContext = createContext<{ close: () => void } | null>(null);

/**
 * Dismiss handle for rows and custom popover children. No-op outside
 * the shell so components can call it unconditionally.
 */
export function useHeaderMenu(): { close: () => void } {
  return useContext(HeaderMenuContext) ?? { close: () => {} };
}

export interface HeaderMenuProps {
  /** Pill content (avatar, wallet icon + address). The chevron is the shell's. */
  trigger: ReactNode;
  /** Identity block rendered first in the popover, above a divider. */
  header?: ReactNode;
  /**
   * Menu rows - HeaderMenuRow, or custom nodes that dismiss via
   * useHeaderMenu().close().
   */
  children: ReactNode;
  /** Popover size overrides (default min-w-56 w-max). */
  menuClassName?: string;
}

export function HeaderMenu({
  trigger,
  header,
  children,
  menuClassName,
}: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={cn(
          "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium",
          "bg-(--brand-surface) border border-(--brand-border) text-(--brand-fg)",
          "hover:bg-(--brand-row-hover) cursor-pointer transition-colors",
        )}
      >
        {trigger}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-(--brand-muted) shrink-0 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <HeaderMenuContext.Provider value={{ close: () => setIsOpen(false) }}>
          <div
            role="menu"
            className={cn(
              "absolute right-0 top-full mt-1 z-50 min-w-56 w-max overflow-hidden",
              "bg-(--brand-surface) border border-(--brand-border) rounded-xl shadow-lg",
              menuClassName,
            )}
          >
            {header && (
              <div className="px-3 py-2.5 border-b border-(--brand-border)/60">
                {header}
              </div>
            )}
            {children}
          </div>
        </HeaderMenuContext.Provider>
      )}
    </div>
  );
}

const ROW_BASE =
  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Row styling on its own for apps that need a different element with
 * identical looks (trade's Settings row keeps next/link - the package
 * itself stays framework-neutral).
 */
export function headerMenuRowClassName(
  variant: "default" | "accent" = "default",
): string {
  return cn(
    ROW_BASE,
    variant === "accent"
      ? "font-medium text-(--brand-accent) hover:bg-(--brand-accent)/10"
      : "text-(--brand-fg) hover:bg-(--brand-row-hover)",
  );
}

export interface HeaderMenuRowProps {
  /** Leading icon - pass it pre-sized (w-4 h-4). */
  icon?: ReactNode;
  children: ReactNode;
  /** Button mode. Selecting a row closes the menu, then runs this. */
  onClick?: () => void;
  /** Anchor mode (plain <a>; external rows pass target="_blank"). */
  href?: string;
  target?: string;
  /** "accent" is the brand sales-CTA look (Book a call). */
  variant?: "default" | "accent";
  /** Button mode only. */
  disabled?: boolean;
  title?: string;
  className?: string;
}

export function HeaderMenuRow({
  icon,
  children,
  onClick,
  href,
  target,
  variant = "default",
  disabled,
  title,
  className,
}: HeaderMenuRowProps) {
  const { close } = useHeaderMenu();
  const rowClassName = cn(headerMenuRowClassName(variant), className);
  const content = (
    <>
      {icon && <span className="flex shrink-0 items-center">{icon}</span>}
      <span>{children}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={target === "_blank" ? "noreferrer" : undefined}
        onClick={() => close()}
        className={rowClassName}
        title={title}
        role="menuitem"
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        close();
        onClick?.();
      }}
      disabled={disabled}
      className={rowClassName}
      title={title}
      role="menuitem"
    >
      {content}
    </button>
  );
}

/** The one sales CTA both post-auth menus carry. */
export function BookACallMenuRow() {
  return (
    <HeaderMenuRow
      href={useBookACallHref()}
      target="_blank"
      variant="accent"
      icon={<PhoneCall className="w-4 h-4" />}
    >
      Book a call
    </HeaderMenuRow>
  );
}
