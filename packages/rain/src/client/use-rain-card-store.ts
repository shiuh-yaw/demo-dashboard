"use client";

/**
 * Rain card storage + retrieval, owned by the consuming app (not the
 * dashboard). The card is persisted on the Dynamic user record's metadata and
 * read back client-side, both via the Dynamic SDK (`useUser` / `useUpdateUser`)
 * - so no admin API token is involved anywhere. The dashboard only makes Rain
 * calls, fed the ids {@link rainCardRef} exposes.
 *
 * This is the platform-provided storage/retrieval contract. The default
 * implementation stores under the `rainCard` metadata key; a consuming app
 * that needs a different store can implement {@link RainCardStore} itself.
 */

import { useCallback } from "react";
import { useUpdateUser, useUser } from "@dynamic-labs-sdk/react-hooks";

import type { CreateCardForUserResponse } from "../types";

export type RainCard = CreateCardForUserResponse;

/** Dynamic user-metadata key under which the Rain card linkage is persisted. */
export const RAIN_CARD_METADATA_KEY = "rainCard";

export interface RainCardStore {
  /** The user's stored Rain card, or null if none is persisted yet. */
  card: RainCard | null;
  /** True while the underlying user record is still loading. */
  isLoading: boolean;
  /** Persist (or replace) the user's Rain card in Dynamic metadata. */
  save: (card: RainCard) => Promise<void>;
  /** Remove the stored Rain card from Dynamic metadata. */
  clear: () => Promise<void>;
}

export function useRainCardStore(): RainCardStore {
  const { data: user, isLoading, isPlaceholderData } = useUser();
  const { mutateAsync: updateUser } = useUpdateUser();

  const card =
    (user?.metadata as { rainCard?: RainCard } | undefined)?.rainCard ?? null;

  const save = useCallback(
    async (next: RainCard) => {
      const metadata = {
        ...((user?.metadata as Record<string, unknown> | undefined) ?? {}),
        [RAIN_CARD_METADATA_KEY]: next,
      };
      await updateUser({ userFields: { metadata } });
    },
    [updateUser, user],
  );

  const clear = useCallback(async () => {
    const metadata = {
      ...((user?.metadata as Record<string, unknown> | undefined) ?? {}),
    };
    delete metadata[RAIN_CARD_METADATA_KEY];
    await updateUser({ userFields: { metadata } });
  }, [updateUser, user]);

  return { card, isLoading: isLoading || isPlaceholderData, save, clear };
}

/** The identifiers the dashboard needs for a Rain call (card secrets + Rain user). */
export function rainCardRef(
  card: RainCard | null,
): { id: string; userId: string } | undefined {
  return card ? { id: card.id, userId: card.userId } : undefined;
}
