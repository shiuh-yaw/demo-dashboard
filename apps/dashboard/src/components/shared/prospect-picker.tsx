"use client";

/**
 * Searchable prospect picker for the legacy per-kind config forms
 * (GTM-03.5B cutover - the hash-auto-create flow died, so forms must supply
 * an explicit prospectId). Full curation UX (search, create-inline, recents)
 * is Phase 07's; this is a combobox fed by `services.prospects.list()` via
 * the `listProspectOptions` action.
 *
 * The dropdown renders inside droplet's Radix `Popover` (`PopoverTrigger` /
 * `PopoverContent`), not a hand-rolled absolute or body-portaled panel.
 * Two prior attempts: (1) `absolute` positioning got clipped by droplet
 * `Dialog`'s `overflow-hidden`; (2) a manual `createPortal` to `document.body`
 * fixed the clipping but broke focus/scroll, because droplet `Dialog` (Radix)
 * applies `pointer-events: none` / `aria-hidden` to everything outside the
 * dialog content and traps focus - a raw body-portaled node is dead to
 * pointer/focus. Radix `Popover` content is a recognized layer in that same
 * stack, so it stays interactive and dismissable even nested inside a Radix
 * `Dialog`, and isn't clipped by the dialog's overflow. ARIA
 * combobox/listbox/option roles inside `PopoverContent` are still wired
 * manually - droplet has no combobox primitive that exposes grouped
 * "mine vs others" rows.
 */

import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/droplet-client";
import {
  listProspectOptions,
  type ProspectOption,
} from "@/lib/actions/prospects";
import { keys } from "@/lib/query/keys";
import { ProspectIcon } from "@/components/shared/prospect-icon";

/** Unwraps the `listProspectOptions` action result for `useQuery` - a
 * failure surfaces as a query error rather than a silently empty list. */
async function fetchProspectOptions(): Promise<ProspectOption[]> {
  const result = await listProspectOptions();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export interface ProspectPickerProps {
  value: string | null;
  onChange: (prospectId: string | null) => void;
  /**
   * Fires with the full selected option (including theme) alongside onChange,
   * so a consuming editor can prefill Appearance without a second fetch.
   * Null when "Unbound" is selected.
   */
  onSelectOption?: (option: ProspectOption | null) => void;
  /**
   * Server-fetched options, seeding the query cache with no initial client
   * fetch (see `configure-for-prospect.tsx`'s parent page). Reopening the
   * picker after the first mount is instant regardless, since the cache
   * lives above the Dialog/Popover that mounts/unmounts this component.
   */
  initialData?: ProspectOption[];
  disabled?: boolean;
  className?: string;
}

const UNBOUND_LABEL = "Unbound (no prospect)";

type Row =
  | { kind: "unbound"; group: "unbound" }
  | { kind: "option"; group: "mine" | "others"; option: ProspectOption };

function rowKey(row: Row): string {
  return row.kind === "unbound" ? "__unbound__" : row.option.id;
}

/** Case-insensitive substring match against an option's name and domain. */
function matchesQuery(option: ProspectOption, query: string): boolean {
  if (query.length === 0) return true;
  const needle = query.toLowerCase();
  return (
    option.name.toLowerCase().includes(needle) ||
    (option.domain ?? "").toLowerCase().includes(needle)
  );
}

export function ProspectPicker({
  value,
  onChange,
  onSelectOption,
  initialData,
  disabled,
  className,
}: ProspectPickerProps) {
  const { data: options = [], isLoading } = useQuery({
    queryKey: keys.prospectOptions,
    queryFn: fetchProspectOptions,
    initialData,
  });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  // Reset search state each time the panel opens; initial focus is handled
  // by PopoverContent's onOpenAutoFocus below.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
  }, [open]);

  function handleChange(prospectId: string | null) {
    onChange(prospectId);
    if (onSelectOption) {
      const selectedOption = prospectId
        ? (options.find((option) => option.id === prospectId) ?? null)
        : null;
      onSelectOption(selectedOption);
    }
  }

  const selected = options.find((option) => option.id === value) ?? null;

  const mine = options.filter((option) => option.isMine);
  const others = options.filter((option) => option.isMine === false);
  const byName = (a: ProspectOption, b: ProspectOption) =>
    a.name.localeCompare(b.name);
  mine.sort(byName);
  others.sort(byName);

  const filteredMine = mine.filter((option) => matchesQuery(option, query));
  const filteredOthers = others.filter((option) => matchesQuery(option, query));
  const showUnbound =
    query.length === 0 ||
    UNBOUND_LABEL.toLowerCase().includes(query.toLowerCase());

  const rows: Row[] = [
    ...(showUnbound ? [{ kind: "unbound", group: "unbound" } as Row] : []),
    ...filteredMine.map(
      (option) => ({ kind: "option", group: "mine", option }) as Row,
    ),
    ...filteredOthers.map(
      (option) => ({ kind: "option", group: "others", option }) as Row,
    ),
  ];

  function commit(row: Row) {
    if (row.kind === "unbound") {
      handleChange(null);
    } else {
      handleChange(row.option.id);
    }
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, rows.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const row = rows[activeIndex];
      if (row) commit(row);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const activeRow = rows[activeIndex];
  const activeId = activeRow ? `${listboxId}-${rowKey(activeRow)}` : undefined;

  return (
    // `modal` is required when this picker is used inside a droplet `Dialog`
    // (e.g. "Customize for a prospect"): a modal Radix Dialog puts
    // `pointer-events: none` on <body> and traps focus, which kills a
    // non-modal Popover's portaled content - you can't click rows, scroll,
    // or type in the search box. A modal Popover owns its own pointer/focus
    // layer above the dialog, restoring all three. Harmless when the picker
    // is used standalone (outside a dialog).
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled || isLoading}
          className={cn(
            "w-full min-w-0 flex items-center justify-between gap-2 pl-2.5 pr-2 py-1.5 rounded-md text-sm bg-background cursor-pointer transition-colors",
            "border border-border",
            "text-foreground",
            "focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className,
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            {selected ? (
              <>
                <ProspectIcon
                  domain={selected.domain}
                  name={selected.name}
                  size={18}
                />
                <span className="truncate">{selected.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground truncate">
                {UNBOUND_LABEL}
              </span>
            )}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] p-0"
        // A modal droplet Dialog sets `pointer-events: none` on <body>; the
        // portaled Popover content inherits it and becomes unclickable (can't
        // click the search box or rows). Force pointer events back on the
        // content so it's interactive whether or not the Popover is modal.
        style={{ pointerEvents: "auto" }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="p-1.5 border-b border-border-divider">
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search prospects..."
            className={cn(
              "w-full min-w-0 box-border px-2 py-1 text-sm rounded border border-border bg-background text-foreground",
              "focus:outline-none focus:ring-1 focus:ring-ring",
            )}
          />
        </div>
        <ul
          role="listbox"
          id={listboxId}
          className="max-h-64 overflow-auto py-1"
        >
          {rows.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              No prospects match
            </li>
          )}
          {rows.map((row, index) => {
            const previousGroup = index > 0 ? rows[index - 1].group : null;
            const header =
              row.group === "mine" && previousGroup !== "mine"
                ? "My prospects"
                : row.group === "others" && previousGroup !== "others"
                  ? "All prospects"
                  : null;
            const id = `${listboxId}-${rowKey(row)}`;
            const isActive = index === activeIndex;
            const isSelected =
              row.kind === "unbound"
                ? value === null
                : value === row.option.id;
            const label =
              row.kind === "unbound" ? UNBOUND_LABEL : row.option.name;

            return (
              <Fragment key={id}>
                {header && (
                  <li
                    role="presentation"
                    className="px-3 pt-2 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
                  >
                    {header}
                  </li>
                )}
                <li
                  id={id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(row)}
                  className={cn(
                    // mx-1 + rounded so the highlight is an inset pill that
                    // never collides with the dropdown's rounded corners;
                    // px-2 keeps text aligned with the px-3 group headers.
                    "flex items-center gap-2 mx-1 rounded-md px-2 py-1.5 text-sm cursor-pointer",
                    isActive ? "bg-accent" : "hover:bg-accent",
                  )}
                >
                  {row.kind === "unbound" ? (
                    <span className="w-[18px] h-[18px] shrink-0" />
                  ) : (
                    <ProspectIcon
                      domain={row.option.domain}
                      name={row.option.name}
                      size={18}
                    />
                  )}
                  <span className="flex-1 truncate text-foreground">
                    {label}
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                </li>
              </Fragment>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
