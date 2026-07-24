"use client";

/**
 * Share-link trigger: mints (or reuses) a share link for a demo config.
 * `trigger="icon"` (default) is a bare icon action for dense rows;
 * `trigger="button"` is a labeled, prominent CTA - callers pick per surface.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ICON_ACTION } from "@/components/shared/icon-action";
import { Check, Copy, Loader2, Send } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import { Tooltip } from "@dynamic-demos/ui";
import { Button as DropletButton } from "@/components/droplet-client";

import { mintShareLink } from "@/lib/actions/share-links";
import { DashboardButton } from "@/components/ui/dashboard-button";
import { ProspectPicker } from "@/components/shared/prospect-picker";
import { ProspectIcon } from "@/components/shared/prospect-icon";

export interface ShareLinkBoundProspect {
  id: string;
  name: string;
  domain?: string | null;
}

export interface ShareLinkButtonProps {
  demoConfigId: string;
  /** Bound demos mint against their own prospect - no picker shown. */
  boundProspect?: ShareLinkBoundProspect | null;
  className?: string;
  /** "icon" (default) is a bare icon action; "button" is a labeled, prominent CTA. */
  trigger?: "icon" | "button";
  /** Button-trigger emphasis: "primary" is a filled CTA, "secondary" (default) is muted. */
  variant?: "primary" | "secondary";
  /** Button-trigger label (default "Share"). */
  label?: string;
}

export function ShareLinkButton({
  demoConfigId,
  boundProspect,
  className,
  trigger = "icon",
  variant = "secondary",
  label = "Share",
}: ShareLinkButtonProps) {
  const [open, setOpen] = useState(false);
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const PANEL_WIDTH = 320;

  // The panel is portaled to <body> so a table's overflow can't clip it; keep
  // it pinned to the trigger's right edge and re-anchor on scroll/resize.
  const reposition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.max(
      8,
      Math.min(r.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8),
    );
    setCoords({ top: r.bottom + 4, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function reset() {
    setProspectId(null);
    setUrl(null);
    setError(null);
    setCopied(false);
  }

  async function mintFor(target: string | null) {
    if (!target || minting) return;
    setMinting(true);
    setError(null);
    try {
      const result = await mintShareLink({ demoConfigId, prospectId: target });
      if (result.success) {
        setUrl(result.data.url);
      } else {
        setError(result.error);
      }
    } finally {
      setMinting(false);
    }
  }

  function handleTriggerClick(event: React.MouseEvent) {
    event.stopPropagation();
    if (!open) {
      reset();
      if (boundProspect) void mintFor(boundProspect.id);
    }
    setOpen((isOpen) => !isOpen);
  }

  return (
    <div ref={containerRef} className={cn("relative inline-flex", className)}>
      {trigger === "button" ? (
        <DropletButton
          type="button"
          variant={variant === "primary" ? undefined : "secondary"}
          size="sm"
          onClick={handleTriggerClick}
        >
          <Send className="h-3.5 w-3.5" />
          {label}
        </DropletButton>
      ) : (
        <Tooltip content="Share" position="top">
          <button
            type="button"
            onClick={handleTriggerClick}
            className={ICON_ACTION}
            aria-label="Share"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      )}

      {open && coords && createPortal(
        <div
          ref={panelRef}
          onClick={(event) => event.stopPropagation()}
          style={{ position: "fixed", top: coords.top, left: coords.left, width: PANEL_WIDTH }}
          className="z-50 rounded-lg border border-border bg-card p-3 text-foreground shadow-lg"
        >
          {boundProspect ? (
            <>
              {/* Bound demos have one stable link - show it straight away. */}
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
                <ProspectIcon
                  domain={boundProspect.domain}
                  name={boundProspect.name}
                  size={16}
                />
                <span className="truncate">Share with {boundProspect.name}</span>
              </div>
              {error ? (
                <>
                  <p className="mb-2 text-xs text-red-600">{error}</p>
                  <DashboardButton
                    size="sm"
                    disabled={minting}
                    onClick={() => void mintFor(boundProspect.id)}
                    className="w-full gap-1.5"
                  >
                    {minting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Retry
                  </DashboardButton>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    readOnly
                    value={url ?? ""}
                    placeholder={minting ? "Generating link..." : ""}
                    onFocus={(event) => event.currentTarget.select()}
                    className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground"
                  />
                  <Tooltip content="Copy" position="top">
                    <button
                      type="button"
                      disabled={!url}
                      onClick={async () => {
                        if (!url) return;
                        await navigator.clipboard.writeText(url);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      aria-label="Copy link"
                      className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </Tooltip>
                </div>
              )}
            </>
          ) : !url ? (
            <>
              <p className="mb-2 text-xs font-medium text-foreground">
                Share this demo with a prospect
              </p>
              <ProspectPicker value={prospectId} onChange={setProspectId} />
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              <DashboardButton
                size="sm"
                disabled={!prospectId || minting}
                onClick={() => void mintFor(prospectId)}
                className="mt-2 w-full gap-1.5"
              >
                {minting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {error ? "Retry" : "Create link"}
              </DashboardButton>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <input
                  readOnly
                  value={url}
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground"
                />
                <Tooltip content="Copy" position="top">
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    aria-label="Copy link"
                    className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </Tooltip>
              </div>
              <button
                type="button"
                onClick={reset}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Create another
              </button>
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
