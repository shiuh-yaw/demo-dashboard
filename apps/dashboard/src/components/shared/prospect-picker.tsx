"use client";

/**
 * Searchable prospect picker for the legacy per-kind config forms
 * (GTM-03.5B cutover - the hash-auto-create flow died, so forms must supply
 * an explicit prospectId). Full curation UX (search, create-inline, recents)
 * is Phase 07's; this is a combobox fed by `services.prospects.list()` via
 * the `listProspectOptions` action.
 *
 * Hand-rolled: the repo has no Combobox/Popover/Command primitive to build
 * on (checked packages/ui, apps/dashboard/src/components, and the droplet
 * SDK exports) - ARIA combobox/listbox/option roles are wired manually.
 */

import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import {
  listProspectOptions,
  type ProspectOption,
} from "@/lib/actions/prospects";
import { ProspectIcon } from "@/components/shared/prospect-icon";

export interface ProspectPickerProps {
  value: string | null;
  onChange: (prospectId: string | null) => void;
  /**
   * Fires with the full selected option (including theme) alongside onChange,
   * so a consuming editor can prefill Appearance without a second fetch.
   * Null when "Unbound" is selected.
   */
  onSelectOption?: (option: ProspectOption | null) => void;
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
  disabled,
  className,
}: ProspectPickerProps) {
  const [options, setOptions] = useState<ProspectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  useEffect(() => {
    let active = true;
    listProspectOptions().then((result) => {
      if (!active) return;
      if (result.success) setOptions(result.data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  // Reset search state and focus the search input each time the panel opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
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
    query.length === 0 || UNBOUND_LABEL.toLowerCase().includes(query.toLowerCase());

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
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-2 pl-2.5 pr-2 py-1.5 rounded-md text-sm bg-white cursor-pointer transition-colors",
          "border border-[var(--widget-border,#e1e4ea)]",
          "text-slate-900",
          "focus:outline-none focus:ring-1",
          "focus:ring-[var(--widget-primary,#335cff)]",
          "focus:border-[var(--widget-primary,#335cff)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <ProspectIcon domain={selected.domain} name={selected.name} size={18} />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <span className="text-slate-500 truncate">{UNBOUND_LABEL}</span>
          )}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="p-1.5 border-b border-slate-100">
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
                "w-full px-2 py-1 text-sm rounded border border-slate-200 bg-white text-slate-900",
                "focus:outline-none focus:ring-1 focus:ring-[var(--widget-primary,#335cff)]",
              )}
            />
          </div>
          <ul
            role="listbox"
            id={listboxId}
            className="max-h-64 overflow-auto py-1"
          >
            {rows.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-500">
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
                      className="px-3 pt-2 pb-1 text-[11px] font-medium text-slate-500 uppercase tracking-wide"
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
                      "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer",
                      isActive ? "bg-slate-100" : "hover:bg-slate-50",
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
                    <span className="flex-1 truncate text-slate-900">
                      {label}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#4779FF] shrink-0" />
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
