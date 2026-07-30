"use client";

/**
 * BookACallLink - book-a-call anchor for server-rendered chrome
 * (SiteHeader/SiteFooter): a client leaf so it can read the resolved href
 * from context. Carries the caller's styling verbatim.
 *
 * The context/provider/hook themselves live in @dynamic-demos/utils so the
 * analytics package can populate them without depending on this chrome
 * package; they're re-exported here for existing ui consumers.
 */

import type { ReactNode } from "react";
import { useBookACallHref } from "@dynamic-demos/utils/book-a-call";

export {
  BookACallProvider,
  useBookACallHref,
  DEFAULT_BOOK_A_CALL_HREF,
} from "@dynamic-demos/utils/book-a-call";

export function BookACallLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={useBookACallHref()}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
