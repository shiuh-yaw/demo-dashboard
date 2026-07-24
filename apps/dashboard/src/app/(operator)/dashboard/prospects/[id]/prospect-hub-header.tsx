"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button, StatusBadge } from "@/components/droplet-client";
import { ProspectIcon } from "@/components/shared/prospect-icon";
import { displayHost } from "@/lib/display-host";
import { ProspectHubTabs } from "./prospect-hub-tabs";

export interface ProspectHubHeaderProps {
  name: string;
  domain: string | null;
  status: "active" | "inactive";
  schedulingUrl: string | null;
  /** The hub base path, e.g. `/dashboard/prospects/{id}` - passed through to the nav. */
  basePath: string;
}

// The stored website value keeps its full URL; ensure it carries a scheme so
// the anchor href is valid even when only a bare host was saved.
function toHref(url: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

// Scroll distance (px) the sentinel sits from the top before the pinned row
// switches to its compact state - keeps the very top of the scroll region
// from flickering between states on a 1px scroll.
const COMPACT_THRESHOLD_PX = 64;

/** Prospect hub header: pinned identity + nav row, compacts once scrolled. */
export function ProspectHubHeader({
  name,
  domain,
  status,
  schedulingUrl,
  basePath,
}: ProspectHubHeaderProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // The nearest ancestor that actually scrolls - the operator shell's
    // content viewport, not `window` (the shell keeps the document itself
    // unscrollable). Walk up until an overflow-y:auto/scroll box is found.
    let root: Element | null = sentinel.parentElement;
    while (root && root !== document.body) {
      if (/(auto|scroll)/.test(getComputedStyle(root).overflowY)) break;
      root = root.parentElement;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setCompact(!entry.isIntersecting),
      { root: root instanceof Element ? root : null, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    // Fragment, not a wrapping div: the sticky row's containing block must be
    // the ancestor that spans the full scroll region (header + segment
    // content, provided by the layout), not a box sized to the header alone -
    // a shorter containing block gives sticky no room to stay pinned.
    <>
      {/* Zero-footprint marker: once it scrolls past the pinned row, compact. */}
      <div
        ref={sentinelRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 w-px"
        style={{ height: COMPACT_THRESHOLD_PX }}
      />
      {/* -top-4 lg:-top-6 mirrors the operator content wrapper's own top
          padding (px-4 py-4 sm:px-6 lg:px-8 lg:py-6) so the pinned row sticks
          flush at the scrollport top instead of leaving that padding as a
          gap above it once scrolled. */}
      <div
        className={`sticky -top-4 z-20 border-b border-border-divider bg-background transition-[padding] duration-200 ease-out motion-reduce:transition-none lg:-top-6 ${
          compact ? "py-4 sm:py-2" : "py-4"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`origin-left shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                compact ? "-mr-2 scale-[0.8] sm:-mr-3 sm:scale-[0.7]" : "-mr-2 scale-[0.8] sm:mr-0 sm:scale-100"
              }`}
            >
              <ProspectIcon domain={domain} name={name} size={40} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  className={`truncate font-semibold text-foreground transition-[font-size] duration-200 ease-out motion-reduce:transition-none ${
                    compact ? "text-lg sm:text-base" : "text-lg sm:text-xl"
                  }`}
                >
                  {name}
                </h1>
                {/* Status badge is desktop-only - keeps the mobile header compact. */}
                <span className="hidden sm:inline-flex">
                  <StatusBadge
                    status={status}
                    label={status === "active" ? "Active" : "Archived"}
                  />
                </span>
              </div>
              <div
                className={`hidden transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none sm:grid ${
                  compact ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
                }`}
              >
                <div className="overflow-hidden">
                  {domain && (
                    <a
                      href={toHref(domain)}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                    >
                      {displayHost(domain)}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Full-width row below identity on mobile; right-aligned inline on sm+. */}
          <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:ml-auto sm:w-auto sm:justify-end">
            <ProspectHubTabs basePath={basePath} />
            {schedulingUrl && (
              <Button asChild variant="secondary" size="sm">
                <a href={schedulingUrl} target="_blank" rel="noreferrer">
                  <CalendarClock className="mr-1.5 h-4 w-4" />
                  Book a call
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
