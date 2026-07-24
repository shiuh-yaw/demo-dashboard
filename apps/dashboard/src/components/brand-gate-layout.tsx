import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DynamicLogo } from "@/components/dynamic-logo";
import { GateSystemTheme } from "@/components/gate-system-theme";

/**
 * Pre-paint theme init for the shell-less gate screens. Runs as an inline
 * script (not a React effect) so it executes before the browser's first paint
 * - otherwise the gate flashes the wrong theme before hydration. Mirrors
 * GateSystemTheme's runtime rule: last-selected operator theme from the
 * `gtm-operator-theme` cookie, else "auto" (follow the OS). Applies to the
 * gate container (`data-theme`) + `<body>` (surface/theme/.dark). Same
 * technique next-themes uses.
 */
const GATE_THEME_INIT = `
(function () {
  try {
    var cookie = document.cookie.match(/(?:^|; )gtm-operator-theme=([^;]+)/);
    var choice = cookie ? decodeURIComponent(cookie[1]) : "auto";
    var dark =
      choice === "dark" ||
      (choice !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    var theme = dark ? "dark" : "light";
    var el = document.currentScript && document.currentScript.parentElement;
    if (el) el.dataset.theme = theme;
    var body = document.body;
    body.dataset.surface = "operator";
    body.dataset.theme = theme;
    body.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

export interface BrandGateBackLink {
  href: string;
  label: string;
}

export interface BrandGateLayoutProps {
  children: React.ReactNode;
  /**
   * Optional top-left link back out of the gate (e.g. "Back to demos" on the
   * auth screen). Omitted on welcome/denied - neither has that affordance.
   */
  backLink?: BrandGateBackLink;
  /** Hide the Dynamic wordmark (e.g. the 404, which can render inside the shell). */
  hideLogo?: boolean;
}

/**
 * Shared full-screen chrome for the dashboard's shell-less "gate" screens:
 * no-session auth, first-run onboarding welcome, and access-denied. Centers
 * a single card under the Dynamic wordmark, no sidebar/top bar around it.
 *
 * Server component itself; the only client piece is `GateSystemTheme`, which
 * applies the OS light/dark preference to these shell-less screens.
 */
export function BrandGateLayout({
  children,
  backLink,
  hideLogo,
}: BrandGateLayoutProps) {
  return (
    <div
      data-surface="operator"
      data-brand-gate=""
      className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background p-6"
    >
      {/* Pre-paint theme init - see GATE_THEME_INIT above. */}
      <script dangerouslySetInnerHTML={{ __html: GATE_THEME_INIT }} />
      <GateSystemTheme />
      {!hideLogo && (
        <DynamicLogo
          width={150}
          height={34}
          wordmarkOnly
          className="text-foreground dark:text-white"
        />
      )}
      {children}
      {backLink ? (
        <Link
          href={backLink.href}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLink.label}
        </Link>
      ) : null}
    </div>
  );
}
