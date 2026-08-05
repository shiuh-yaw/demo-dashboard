/**
 * The one loading skeleton for the connect flow.
 *
 * There are two distinct waiting phases and they used to render different
 * placeholders, so the hand-off between them read as a flash:
 *
 *   1. the lazy chunk is still downloading (ConnectFlowLazy's `loading`)
 *   2. the chunk mounted, but the SDK is initialising / fetching the catalogue
 *      (ConnectFlow's `!ready` branch)
 *
 * Both now render the same markup, so the transition is invisible. The search
 * field is part of the skeleton on purpose: the real UI shows one above the
 * list, and omitting it here made the list jump up a row's height on ready.
 */

import { Skeleton } from "@dynamic-demos/ui";

import { Disclosure } from "./disclosure";

const ROW_COUNT = 5;

/** Inner content only - for use inside ConnectFlow's existing card. */
export function ConnectSkeletonBody() {
  return (
    <div aria-hidden="true">
      <div className="mt-[18px] mb-3.5 flex h-10 items-center gap-2.5 rounded-[var(--widget-radius,10px)] bg-(--brand-row-bg) px-3">
        <Skeleton className="h-[18px] w-[18px] shrink-0 rounded" />
        <Skeleton className="h-3 flex-1 rounded-full" />
      </div>
      <div className="list">
        {Array.from({ length: ROW_COUNT }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-(--brand-radius) bg-(--brand-row-bg) px-4 py-3"
          >
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
            <Skeleton className="h-3.5 flex-1 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full card shell - for the phase before ConnectFlow itself has mounted.
 *
 * Includes the Disclosure footer because ConnectFlow's own not-ready state
 * does. Omitting it here made the card taller and re-centred it in the flex
 * column when the real component took over, which is half of what read as a
 * flash between the two phases.
 */
export function ConnectSkeletonCard() {
  return (
    <div className="page">
      <main className="card">
        <p className="eyebrow">Connect a wallet</p>
        <h1 className="card__title">Pick a wallet to continue</h1>
        <ConnectSkeletonBody />
      </main>
      <Disclosure />
    </div>
  );
}
