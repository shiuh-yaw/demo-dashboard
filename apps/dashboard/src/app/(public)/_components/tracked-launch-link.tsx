"use client";

/**
 * Client leaf for the catalog landing's grid "Launch demo" link.
 * `demo-card.tsx` stays a server component; this is the only client
 * boundary, so `useTrack()` can fire the `demo_launch` step event on
 * click. Fail-silent: a throw here must never break the underlying `<a>`
 * navigation, so `step()` is wrapped in try/catch (belt-and-braces on top
 * of the analytics package's own fail-silent guarantee).
 */

import type { ReactNode } from "react";
import { useTrack } from "@dynamic-demos/analytics";

export interface TrackedLaunchLinkProps {
  /** `LandingDemo.slug` for the demo this link launches - reported as `props.demo`. */
  demoSlug: string;
  href: string;
  className?: string;
  target?: string;
  rel?: string;
  children: ReactNode;
}

export function TrackedLaunchLink({
  demoSlug,
  href,
  className,
  target,
  rel,
  children,
}: TrackedLaunchLinkProps) {
  const { step } = useTrack();

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={className}
      onClick={() => {
        try {
          step("demo_launch", { demo: demoSlug });
        } catch {
          // fail-silent - never block the launch navigation
        }
      }}
    >
      {children}
    </a>
  );
}
