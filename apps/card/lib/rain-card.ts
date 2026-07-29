import type { CreateCardForUserResponse } from "@dynamic-demos/rain";

export type RainCard = CreateCardForUserResponse;

/** The Rain card linkage persisted to Dynamic user metadata after apply. */
export function getRainCardFromUser(
  user: { metadata?: { rainCard?: RainCard } } | null | undefined,
): RainCard | null {
  return user?.metadata?.rainCard ?? null;
}
