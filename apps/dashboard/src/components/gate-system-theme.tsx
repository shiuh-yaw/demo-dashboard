"use client";

import { useEffect } from "react";
import { THEME_COOKIE, parseTheme } from "@/lib/operator-prefs";

/**
 * Applies the OS light/dark preference to the shell-less gate screens
 * (auth / onboarding welcome / denied), which render outside `OperatorShell`
 * and so never get its theme mirroring. Mirrors the system preference onto
 * `<body>` (`data-theme` + the `.dark` class that carries droplet's dark
 * chrome tokens) exactly like the shell's "auto" theme, and cleans up on
 * unmount so it never leaks into the authenticated app shell.
 */
export function GateSystemTheme() {
  useEffect(() => {
    const body = document.body;
    // The gate container carries `data-surface="operator"` (from React) and
    // needs `data-theme` on the SAME element for the operator dark tokens
    // (`[data-surface][data-theme=dark]`, incl. the --widget-* the login card
    // uses) - a directly-set light var on the container otherwise beats any
    // inherited dark value. <body> mirrors surface+theme+.dark for droplet
    // portals and Tailwind `dark:` utilities (e.g. the logo).
    const container =
      document.querySelector<HTMLElement>("[data-brand-gate]");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      // Same rule as the authed OperatorShell: last selected theme from the
      // operator cookie, else "auto" (follow the OS). One theme model for the
      // whole operator surface (gate + app); public stays light separately.
      const raw = document.cookie
        .split("; ")
        .find((c) => c.startsWith(`${THEME_COOKIE}=`))
        ?.split("=")[1];
      const choice = parseTheme(raw ? decodeURIComponent(raw) : undefined);
      const dark = choice === "dark" || (choice === "auto" && mq.matches);
      const theme = dark ? "dark" : "light";
      if (container) container.dataset.theme = theme;
      body.dataset.surface = "operator";
      body.dataset.theme = theme;
      body.classList.toggle("dark", dark);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      if (container) delete container.dataset.theme;
      // Intentionally do NOT strip the theme off <body> here. Navigating
      // gate -> gate would otherwise flash the light default body between
      // this screen's unmount and the next screen's re-apply. Both other
      // surfaces reset <body> themselves on mount - OperatorShell (authed
      // app) and ForceLightTheme (public layout) - so leaving it set can
      // never bleed a dark <body> into a light surface.
    };
  }, []);

  return null;
}
