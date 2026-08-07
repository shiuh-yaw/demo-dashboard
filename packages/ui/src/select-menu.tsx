"use client";

/**
 * Custom select - a button plus a listbox popup, styled from the widget CSS
 * variable contract.
 *
 * Why not `Select` (the native `<select>` in `./select.tsx`): the browser draws
 * a native `<option>` list with the OS palette, so on a themed widget surface
 * the closed control matches and the open menu does not. Nothing in CSS can
 * restyle that popup. This renders the list itself.
 *
 * The list goes in a portal with fixed coordinates rather than absolutely
 * inside the trigger's parent, because these controls live in rows inside
 * `overflow-y-auto` lists, which would clip an in-flow popup.
 *
 * `Select` stays as-is for plain form surfaces - native is better on mobile,
 * where the OS picker is the expected control.
 */

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@dynamic-demos/utils";

export interface SelectMenuOption<T extends string = string> {
  value: T;
  label: ReactNode;
  /**
   * Shown on the trigger when this option is selected, instead of `label`.
   *
   * For lists whose rows carry more than the name - a balance, a count - which
   * belongs in the open list but not on a closed control that has to fit a
   * row.
   */
  triggerLabel?: ReactNode;
  /** Second line under the label, for disambiguating similar options. */
  description?: string;
  disabled?: boolean;
}

export interface SelectMenuProps<T extends string = string> {
  value: T;
  options: ReadonlyArray<SelectMenuOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Accessible name. Pair with `label` only if the visible label is elsewhere. */
  "aria-label"?: string;
  /** Shown when `value` matches no option. */
  placeholder?: string;
  /** Applied to the trigger, so the caller sets width. */
  className?: string;
  /** Which trigger edge the popup lines up with. */
  align?: "start" | "end";
  id?: string;
}

/** Popup gap from the trigger, and the margin it keeps from the viewport edge. */
const OFFSET = 4;
const VIEWPORT_MARGIN = 8;

export function SelectMenu<T extends string = string>({
  value,
  options,
  onChange,
  disabled = false,
  placeholder,
  className,
  align = "start",
  id,
  "aria-label": ariaLabel,
}: SelectMenuProps<T>) {
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-listbox`;

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);
  /** Keyboard focus, which moves independently of the committed value. */
  const [activeIndex, setActiveIndex] = useState(-1);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  useEffect(() => setMounted(true), []);

  // Measured before paint: a popup that positions in an effect flashes at the
  // wrong coordinates first.
  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    const place = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const list = listRef.current;
      const height = list?.offsetHeight ?? 0;
      const width = Math.max(list?.offsetWidth ?? 0, rect.width);

      // Flip above when below would overflow, but only if above has more room -
      // otherwise a tall list is better cut off downwards than upwards.
      const below = window.innerHeight - rect.bottom - OFFSET;
      const above = rect.top - OFFSET;
      const flip = height > below && above > below;

      const left =
        align === "end" ? rect.right - width : rect.left;

      setCoords({
        top: flip ? rect.top - height - OFFSET : rect.bottom + OFFSET,
        left: Math.min(
          Math.max(VIEWPORT_MARGIN, left),
          Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN),
        ),
        minWidth: rect.width,
      });
    };

    place();

    // `true` to catch scrolls on any ancestor, not just the window - these sit
    // inside scrollable lists.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, align, options.length]);

  // Dismiss on outside press and on Escape. Pointerdown rather than click so a
  // press that starts outside closes before it can activate anything.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        listRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  const openMenu = (index: number) => {
    if (disabled) return;
    setActiveIndex(index);
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const commit = (option: SelectMenuOption<T>) => {
    if (option.disabled) return;
    setOpen(false);
    triggerRef.current?.focus();
    if (option.value !== value) onChange(option.value);
  };

  /** Next selectable index in `step` direction, skipping disabled options. */
  const step = (from: number, direction: 1 | -1) => {
    for (let i = 1; i <= options.length; i += 1) {
      const next =
        (from + direction * i + options.length * i) % options.length;
      if (!options[next]?.disabled) return next;
    }
    return from;
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        if (!open) {
          openMenu(selectedIndex >= 0 ? selectedIndex : 0);
        } else {
          setActiveIndex((current) => step(current < 0 ? 0 : current, direction));
        }
        break;
      }
      case "Home":
        if (open) {
          event.preventDefault();
          setActiveIndex(step(-1, 1));
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();
          setActiveIndex(step(options.length, -1));
        }
        break;
      case "Enter":
      case " ": {
        event.preventDefault();
        if (!open) {
          openMenu(selectedIndex >= 0 ? selectedIndex : 0);
          break;
        }
        const option = options[activeIndex];
        if (option) commit(option);
        break;
      }
      case "Escape":
        if (open) {
          event.preventDefault();
          closeMenu();
        }
        break;
      case "Tab":
        // Tab commits nothing and leaves - matches a native select.
        if (open) setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu(selectedIndex))}
        onKeyDown={onKeyDown}
        className={cn(
          "inline-flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-lg border py-1.5 pl-2.5 pr-2 text-sm transition-colors",
          "border-[var(--widget-border,#e1e4ea)] bg-[var(--widget-bg,#ffffff)] text-[var(--widget-fg,#252731)]",
          "outline-none hover:bg-[var(--widget-row-hover,#eef1f1)]",
          "focus-visible:border-[var(--widget-primary,#335cff)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-[var(--widget-primary,#335cff)]",
          className,
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left",
            !selected && "text-[var(--widget-muted,#9ca3af)]",
          )}
        >
          {selected?.triggerLabel ?? selected?.label ?? placeholder ?? ""}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[var(--widget-muted,#64748b)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
            }
            style={{
              // Rendered offscreen for the first paint, so it can be measured
              // before it is placed.
              top: coords?.top ?? -9999,
              left: coords?.left ?? -9999,
              minWidth: coords?.minWidth,
              visibility: coords ? "visible" : "hidden",
            }}
            className={cn(
              "fixed z-[9999] max-h-60 overflow-y-auto p-1",
              "rounded-lg border border-[var(--widget-border,#e1e4ea)]",
              "bg-[var(--widget-bg,#ffffff)] shadow-lg",
            )}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <div
                  key={option.value}
                  id={`${listboxId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onPointerEnter={() =>
                    !option.disabled && setActiveIndex(index)
                  }
                  onClick={() => commit(option)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    "text-[var(--widget-fg,#252731)]",
                    isActive && "bg-[var(--widget-row-hover,#eef1f1)]",
                    option.disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="block truncate text-[11px] text-[var(--widget-muted,#64748b)]">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <Check
                      aria-hidden
                      className="h-3.5 w-3.5 shrink-0 text-[var(--widget-primary,#335cff)]"
                    />
                  )}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
