"use client";

/**
 * <BookACallCta /> - floating book-a-call button.
 *
 * Renders nothing until `getShareContext` resolves a `cta`. Fetches once on
 * mount using the `dd_share` cookie token (set by `<GtmTracker>` from the
 * `?share=` query param). Revoking the share link server-side makes the
 * context endpoint stop returning a `cta`, so the button disappears on the
 * next mount - the tracker never polls.
 */

import { useEffect, useState } from "react";
import { getShareContext } from "./context";
import { getShareToken } from "./cookies";
import { useTrack } from "./use-track";

export function BookACallCta() {
  const [cta, setCta] = useState<{ label: string; url: string } | undefined>(
    undefined,
  );
  const { step } = useTrack();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const token = getShareToken();
        const context = await getShareContext(token);
        if (!cancelled && context.cta) {
          setCta(context.cta);
        }
      } catch {
        // fail-silent
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!cta) return null;

  const handleClick = () => {
    try {
      step("book_a_call_clicked");
    } catch {
      // fail-silent
    }
    try {
      window.open(cta.url, "_blank", "noopener,noreferrer");
    } catch {
      // fail-silent
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 1000,
        padding: "12px 20px",
        borderRadius: "9999px",
        border: "none",
        background: "var(--brand-primary, #4779ff)",
        color: "var(--brand-primary-fg, #ffffff)",
        fontSize: "14px",
        fontWeight: 600,
        lineHeight: 1,
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.16)",
        cursor: "pointer",
      }}
    >
      {cta.label}
    </button>
  );
}
