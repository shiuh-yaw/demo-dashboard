"use client";

export type SheetName = "fund" | "send" | "earn" | "connect";
const EVENT = "exchange:open-sheet";

/** Lets the presenter rail open an in-app action without owning its state. */
export const openSheet = (name: SheetName) => window.dispatchEvent(new CustomEvent(EVENT, { detail: name }));

export const onOpenSheet = (fn: (name: SheetName) => void) => {
  const h = (e: Event) => fn((e as CustomEvent<SheetName>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
};
