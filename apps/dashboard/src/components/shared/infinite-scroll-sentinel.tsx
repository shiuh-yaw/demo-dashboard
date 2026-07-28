"use client";

/**
 * Zero-height marker that fires `onReach` when it scrolls into view (plus a
 * 200px prefetch margin), for auto-load-on-scroll lists. `disabled` (pass
 * `!hasNextPage || isFetchingNextPage`) unhooks the observer so an in-flight
 * page can't be requested twice and a fully-loaded list stops observing.
 *
 * The observer uses the viewport as root; IntersectionObserver clips the
 * target against intermediate scroll containers, so a single sentinel works
 * whether the page scrolls (mobile) or an inner overflow container scrolls
 * (desktop). `onReach` is read through a ref so a fresh callback each render
 * never churns the observer.
 */

import { useEffect, useRef } from "react";

export interface InfiniteScrollSentinelProps {
  onReach: () => void;
  disabled?: boolean;
}

export function InfiniteScrollSentinel({
  onReach,
  disabled,
}: InfiniteScrollSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onReachRef = useRef(onReach);
  onReachRef.current = onReach;

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onReachRef.current();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [disabled]);

  return <div ref={ref} aria-hidden className="h-px w-full" />;
}
