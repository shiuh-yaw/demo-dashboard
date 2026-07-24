"use client";

import { useEffect } from "react";

/**
 * The operator tree's ThemeProvider (next-themes) tags <html> with the
 * `dark` class from system preference and does not remove it on unmount,
 * so a client-side navigation back from /brands would leave the landing
 * rendering Droplet components with dark tokens. The public pages are
 * light-only: strip the class on mount.
 */
export function ForceLightTheme() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    // The shell-less gate screens (GateSystemTheme) intentionally leave the
    // operator surface + dark theme on <body> so gate->gate navigation does
    // not flash; strip it here so a client-side nav into the public surface
    // resets fully to light.
    document.body.classList.remove("dark");
    delete document.body.dataset.surface;
    delete document.body.dataset.theme;
  }, []);
  return null;
}
