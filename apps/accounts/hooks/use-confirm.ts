"use client";

/**
 * Arming for destructive actions - the second press is the one that commits.
 *
 * Inline rather than a modal dialog: these actions live in widget rows, and the
 * widget's own controls stay inside the card (a portalled overlay would cover
 * the page around it). One row is armed at a time, and arming lapses on its own
 * so a row cannot sit primed indefinitely.
 */

import { useEffect, useState } from "react";

const DISARM_AFTER_MS = 6_000;

export interface ConfirmArming {
  isArmed: (key: string) => boolean;
  arm: (key: string) => void;
  disarm: () => void;
}

export function useConfirm(timeoutMs: number = DISARM_AFTER_MS): ConfirmArming {
  const [armed, setArmed] = useState<string | null>(null);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(null), timeoutMs);
    return () => clearTimeout(timer);
  }, [armed, timeoutMs]);

  return {
    isArmed: (key) => armed === key,
    arm: (key) => setArmed(key),
    disarm: () => setArmed(null),
  };
}
