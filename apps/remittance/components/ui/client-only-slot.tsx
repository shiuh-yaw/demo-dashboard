"use client";

import { useState, useEffect } from "react";

interface ClientOnlySlotProps {
  children: React.ReactNode;
  /** Placeholder shown during SSR and initial client render to avoid hydration mismatch. */
  placeholder?: React.ReactNode;
}

/**
 * Renders children only after the component has mounted on the client.
 * Use when a child component causes hydration mismatches (e.g. due to
 * client-only hooks, browser extensions, or differing server/client state).
 *
 * Both server and initial client render show the placeholder, ensuring
 * consistency. After mount, children are shown.
 */
export function ClientOnlySlot({
  children,
  placeholder = null,
}: ClientOnlySlotProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <>{placeholder}</>;
  return <>{children}</>;
}
