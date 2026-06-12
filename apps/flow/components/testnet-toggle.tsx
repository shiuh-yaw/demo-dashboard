"use client";

/**
 * Testnet toggle pill — syncs with the `?testnet=true` URL param.
 * When on, the host passes a `tokenFilter` to the checkout widget
 * that only shows tokens on testnet chains.
 *
 * Uses direct `window.location` reads + `history.replaceState` to
 * avoid Next.js `useSearchParams` (which requires a `<Suspense>`
 * boundary in the App Router).
 */

import { useCallback, useSyncExternalStore } from "react";

function subscribeToUrl(cb: () => void) {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
}

function getIsTestnet() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("testnet") === "true";
}

function getServerSnapshot() {
  return false;
}

export function useTestnetMode() {
  const isTestnet = useSyncExternalStore(subscribeToUrl, getIsTestnet, getServerSnapshot);

  const toggle = useCallback(() => {
    const url = new URL(window.location.href);
    if (isTestnet) {
      url.searchParams.delete("testnet");
    } else {
      url.searchParams.set("testnet", "true");
    }
    window.history.replaceState(null, "", url.toString());
    // Force a re-render since replaceState doesn't fire popstate.
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [isTestnet]);

  return { isTestnet, toggle } as const;
}

export function TestnetToggle({
  isTestnet,
  onToggle,
}: {
  isTestnet: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer select-none"
      style={{
        borderColor: isTestnet
          ? "var(--brand-primary, #4779ff)"
          : "var(--brand-border, #e1e4ea)",
        background: isTestnet
          ? "color-mix(in srgb, var(--brand-primary, #4779ff) 10%, transparent)"
          : "var(--brand-surface, #fff)",
        color: isTestnet
          ? "var(--brand-primary, #4779ff)"
          : "var(--brand-muted, #99a0ae)",
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{
          background: isTestnet
            ? "var(--brand-primary, #4779ff)"
            : "var(--brand-muted, #99a0ae)",
        }}
      />
      Testnet
    </button>
  );
}
