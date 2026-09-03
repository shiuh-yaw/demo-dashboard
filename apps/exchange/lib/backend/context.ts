"use client";

import { createContext, useContext } from "react";
import type { Backend } from "./types";

export const BackendContext = createContext<Backend | null>(null);

export const useBackend = () => {
  const b = useContext(BackendContext);
  if (!b) throw new Error("useBackend outside BackendProvider");
  return b;
};
