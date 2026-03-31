"use client";

import { useState, useEffect } from "react";
import { getInitStatus, waitForClientInitialized } from "@/lib/dynamic";

export function useClientInitialized(): boolean {
  const [ready, setReady] = useState(() => getInitStatus() === "finished");

  useEffect(() => {
    if (ready) return;
    waitForClientInitialized().then(() => setReady(true));
  }, [ready]);

  return ready;
}
