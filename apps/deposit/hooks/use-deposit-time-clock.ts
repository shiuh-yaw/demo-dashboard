"use client";

import { useEffect, useState } from "react";

export function useDepositTimeClock(intervalMs: number): number {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return nowMs;
}
