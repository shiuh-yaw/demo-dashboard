"use client";

/**
 * Minimal "Copy share link" action for the existing per-kind demo lists
 * (Phase GTM-05). Deliberately small - Phase 07 rebuilds the Demos-table
 * surface with the full share/analytics UI.
 */

import { useEffect, useRef, useState } from "react";
import { ICON_ACTION } from "@/components/shared/icon-action";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import { Tooltip } from "@dynamic-demos/ui";

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
}

export function ShareLinkButton({
  demoConfigId,
  boundProspect,
  className,
}: ShareLinkButtonProps) {
  const [open, setOpen] = useState(false);
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={containerRef} className={cn("relative inline-flex", className)}>
      <Tooltip content="Copy share link" position="top">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (!open) {
              reset();
              if (boundProspect) void mintFor(boundProspect.id);
            }
            setOpen((isOpen) => !isOpen);
          }}
          className={ICON_ACTION}
          aria-label="Copy share link"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </Tooltip>

      {open && (
        <div
          onClick={(event) => event.stopPropagation()}
          className="absolute right-0 z-30 mt-1 w-72 rounded-md border border-[#e1e4ea] bg-white p-3 shadow-lg"
        >
          {!url ? (
            <>
              {boundProspect ? (
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  {minting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ProspectIcon
                      domain={boundProspect.domain}
                      name={boundProspect.name}
                      size={16}
                    />
                  )}
                  <span className="truncate">
                    {minting
                      ? `Creating link for ${boundProspect.name}...`
                      : `Share with ${boundProspect.name}`}
                  </span>
                </div>
              ) : (
                <>
                  <p className="mb-2 text-xs font-medium text-slate-700">
                    Share this demo with a prospect
                  </p>
                  <ProspectPicker value={prospectId} onChange={setProspectId} />
                </>
              )}
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              {(!boundProspect || error) && (
                <DashboardButton
                  size="sm"
                  disabled={(!boundProspect && !prospectId) || minting}
                  onClick={() => void mintFor(boundProspect?.id ?? prospectId)}
                  className="mt-2 w-full gap-1.5"
                >
                  {minting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {error ? "Retry" : "Create link"}
                </DashboardButton>
              )}
            </>
          ) : (
            <>
              <p className="mb-2 text-xs font-medium text-slate-700">
                Share link ready
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  readOnly
                  value={url}
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 truncate rounded-md border border-[#e1e4ea] bg-[#f8f9fb] px-2 py-1 text-xs text-[#525866]"
                />
                <Tooltip content="Copy" position="top">
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    aria-label="Copy"
                    className="shrink-0 rounded-md border border-[#e1e4ea] p-1.5 text-[#525866] hover:bg-[#f5f7fa]"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </Tooltip>
              </div>
              {!boundProspect && (
                <button
                  type="button"
                  onClick={reset}
                  className="mt-2 text-xs text-[#525866] hover:text-[#0e121b]"
                >
                  Create another
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
