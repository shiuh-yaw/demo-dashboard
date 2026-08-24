"use client";

/**
 * Said once, wherever a layer turns out not to exist.
 *
 * A policy layer is created with the wallet, and nothing creates one after the
 * fact: the API has `get` and `update` for a layer and no `create`, so a wallet
 * minted before policies were available on the environment cannot be given
 * rules at all. Without this the screens offer a save that always 404s.
 */

import { Info } from "lucide-react";

export function MissingLayerNotice() {
  return (
    <div className="flex gap-2.5 rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) px-3 py-2.5">
      <Info className="mt-px h-4 w-4 shrink-0 text-(--brand-muted)" />
      <p className="text-[11px] leading-relaxed text-(--brand-muted)">
        This wallet has no policy layer, so rules cannot be set on it. A layer is
        created with the wallet and cannot be added afterwards - create a new
        wallet to try rules.
      </p>
    </div>
  );
}
