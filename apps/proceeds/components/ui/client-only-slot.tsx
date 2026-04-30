"use client";

import { useState, useEffect } from "react";

interface ClientOnlySlotProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
}

export function ClientOnlySlot({ children, placeholder }: ClientOnlySlotProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{placeholder}</>;
  return <>{children}</>;
}
