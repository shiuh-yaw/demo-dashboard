/**
 * Demo hero band - the category-tinted gradient panel with a dot texture and
 * a centered illustration. One source for the public landing card, the
 * operator dashboard, and the OG unfurl image.
 *
 * The `dots` prop exists because the two renderers cannot share a technique:
 * browsers tile a 1px radial-gradient via `background-size`, but satori
 * ignores `background-size` outright (verified - it renders byte-identical to
 * no dots at all), so the OG path draws real `<circle>` elements instead.
 * Same look, two implementations, one component.
 */

import type { CSSProperties, ReactNode } from "react";

export interface DemoHeroBandProps {
  /** Gradient start - usually the category tint blended into the base. */
  from: string;
  /** Gradient end - usually the plain surface color. */
  to: string;
  /** Dot color. Pass an already-resolved rgba for the `svg` mode. */
  dotColor: string;
  /**
   * `css` tiles a radial-gradient (browsers only). `svg` emits explicit
   * circles and is REQUIRED under satori. `svg` needs `width`/`height` to
   * know how many dots to lay down.
   */
  dots?: "css" | "svg" | "none";
  dotSpacing?: number;
  /** Only used by `dots="svg"`. */
  width?: number;
  height?: number;
  radius?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Explicit dot grid for satori. Cheap: a 460x260 band at 14px is ~600 circles. */
function SvgDots({
  width,
  height,
  spacing,
  color,
}: {
  width: number;
  height: number;
  spacing: number;
  color: string;
}) {
  const circles = [];
  for (let y = spacing; y < height; y += spacing) {
    for (let x = spacing; x < width; x += spacing) {
      circles.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={1} fill={color} />);
    }
  }
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      {circles}
    </svg>
  );
}

export function DemoHeroBand({
  from,
  to,
  dotColor,
  dots = "css",
  dotSpacing = 14,
  width,
  height,
  radius,
  className,
  style,
  children,
}: DemoHeroBandProps) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        ...(radius === undefined ? {} : { borderRadius: radius }),
        ...(width === undefined ? {} : { width }),
        ...(height === undefined ? {} : { height }),
        // Color and image set separately: satori rejects a bare color used as
        // a layer inside the `background` shorthand.
        backgroundColor: to,
        backgroundImage: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        ...style,
      }}
    >
      {dots === "css" ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${dotColor} 1px, transparent 1px)`,
            backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
          }}
        />
      ) : null}
      {dots === "svg" && width !== undefined && height !== undefined ? (
        <SvgDots width={width} height={height} spacing={dotSpacing} color={dotColor} />
      ) : null}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
