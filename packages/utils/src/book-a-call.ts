"use client";

/**
 * Book-a-call href context. Lives in utils (not ui) so the analytics
 * package's GtmTracker can populate it without depending on the demo-chrome
 * package - keeping @dynamic-demos/analytics consumable on its own. The
 * styled BookACallLink anchor stays in @dynamic-demos/ui.
 *
 * `createElement` (no JSX) keeps this a plain .ts so utils needs no JSX
 * tsconfig - only `react` as a peer dependency.
 */

import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";

export const DEFAULT_BOOK_A_CALL_HREF = "https://www.dynamic.xyz/book-a-call";

const BookACallContext = createContext<string>(DEFAULT_BOOK_A_CALL_HREF);

export function BookACallProvider({
  href,
  children,
}: {
  /** Falsy falls back to the generic Dynamic link. */
  href?: string | null;
  children: ReactNode;
}) {
  return createElement(
    BookACallContext.Provider,
    { value: href || DEFAULT_BOOK_A_CALL_HREF },
    children,
  );
}

export function useBookACallHref(): string {
  return useContext(BookACallContext);
}
