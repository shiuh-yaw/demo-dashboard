import type { CSSProperties, ReactNode } from "react";

export interface MonogramChipProps {
  /**
   * String to derive the monogram from (first two characters are uppercased).
   * If `label` is provided it wins over `text`.
   */
  text?: string;
  /** Explicit characters to show, unmodified (e.g. a country code "US"). */
  label?: string;
  /** Optional icon override — takes priority over text/label. */
  icon?: ReactNode;
  /** "square" (32×32, 8px radius) or "wide" (28×20, 4px radius — flag). */
  shape?: "square" | "wide";
}

const SIZE: Record<
  NonNullable<MonogramChipProps["shape"]>,
  CSSProperties
> = {
  square: { width: 32, height: 32, borderRadius: 8 },
  wide: { width: 28, height: 20, borderRadius: 4 },
};

/**
 * Small rounded tile that holds a 2-letter monogram, a country code, or an
 * icon. Used in data-table "source" columns and country-breakdown rows.
 */
export function MonogramChip({
  text,
  label,
  icon,
  shape = "square",
}: MonogramChipProps) {
  const glyph =
    icon ?? label ?? (text ? text.slice(0, 2).toUpperCase() : "");
  const fontSize = shape === "wide" ? 9 : 10;
  return (
    <div
      className="flex items-center justify-center shrink-0 text-(--brand-muted)"
      style={{
        ...SIZE[shape],
        background: "var(--brand-row-bg)",
        border: "1px solid var(--brand-border)",
      }}
    >
      {typeof glyph === "string" ? (
        <span
          className="font-semibold"
          style={{ fontSize: `${fontSize}px` }}
        >
          {glyph}
        </span>
      ) : (
        glyph
      )}
    </div>
  );
}
