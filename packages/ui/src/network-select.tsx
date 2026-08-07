"use client";

/**
 * Network picker for a widget toolbar - icon + display name, one line.
 *
 * Deliberately presentational: it takes a plain list of `{ id, label,
 * iconUrl }` and reports the chosen id. It never touches a Dynamic client,
 * because the apps that use it pin different SDK versions and a shared
 * component that imported SDK types could only ever serve one of them. Each
 * app maps its own `NetworkData[]` down to `NetworkOption[]`.
 *
 * Built on `SelectMenu` rather than a bespoke dropdown so the list is
 * portalled. These toolbars sit above `overflow-y-auto` transaction lists,
 * and an in-flow popup is clipped by the scroll container the moment the
 * list is long enough to scroll.
 */

import { cn } from "@dynamic-demos/utils";
import { SelectMenu } from "./select-menu";

export interface NetworkOption {
  /** Stable id passed back to `onChange` - typically the SDK's `networkId`. */
  id: string;
  label: string;
  iconUrl?: string;
}

export interface NetworkSelectProps {
  value: string;
  options: ReadonlyArray<NetworkOption>;
  onChange: (networkId: string) => void;
  disabled?: boolean;
  align?: "start" | "end";
  className?: string;
  /** Accessible name. Defaults to "Network". */
  "aria-label"?: string;
}

/** Icon + name, shared by the trigger and the list so both read alike. */
function NetworkLabel({ option }: { option: NetworkOption }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {option.iconUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={option.iconUrl}
          alt=""
          aria-hidden="true"
          className="h-4 w-4 shrink-0 rounded"
        />
      )}
      <span className="truncate">{option.label}</span>
    </span>
  );
}

export function NetworkSelect({
  value,
  options,
  onChange,
  disabled,
  align = "start",
  className,
  "aria-label": ariaLabel = "Network",
}: NetworkSelectProps) {
  // One network is a fact, not a choice - render it as a label so the widget
  // does not offer a menu that can only re-pick what is already selected.
  if (options.length <= 1) {
    const only = options[0];
    if (!only) return null;
    return (
      <span
        className={cn(
          "flex items-center gap-1.5 px-1 py-1.5 text-xs text-(--brand-fg)",
          className,
        )}
      >
        <NetworkLabel option={only} />
      </span>
    );
  }

  return (
    <SelectMenu
      value={value}
      onChange={onChange}
      disabled={disabled}
      align={align}
      // Sized to its content, not the row. `SelectMenu` defaults to `w-full`
      // because it is usually a form field; here it is a toolbar chip sitting
      // beside icon buttons, and stretching it across the row made the network
      // look like the screen's subject rather than a filter on it.
      className={cn("w-auto text-xs", className)}
      aria-label={ariaLabel}
      options={options.map((option) => ({
        value: option.id,
        label: <NetworkLabel option={option} />,
      }))}
    />
  );
}
