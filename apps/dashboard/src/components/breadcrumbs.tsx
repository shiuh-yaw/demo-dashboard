"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Route-hierarchy breadcrumb for the operator top bar. The terminal label for
 * a dynamic route (e.g. a prospect id) is supplied by the server page through
 * the context setter so it reads as the resolved name, not the raw id.
 */

type Crumb = { label: string; href?: string };

const SECTION_LABELS: Record<string, string> = {
  demos: "Demos",
  analytics: "Analytics",
  operations: "Admin",
  profile: "Profile",
  denied: "Access",
  checkouts: "Checkouts",
  wallets: "Wallets",
  earns: "Earn",
  remittance: "Remittance",
  trade: "Trade",
  widgets: "Widgets",
  "visa-direct": "Fireblocks MTLco",
  documentation: "Documentation",
};

// Full-path labels for nested operator routes so every sub-route yields a
// complete trail (ancestors link, the last crumb is current).
const PATH_LABELS: Record<string, string> = {
  "/dashboard/operations": "Admin",
};

const DOC_TITLES: Record<string, string> = {
  checkouts: "Checkouts",
  iron: "Iron",
  onramp: "Coinbase Onramp",
  blindpay: "BlindPay",
};

function titleCase(seg: string): string {
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

export function buildTrail(
  pathname: string,
  dynamicLabel: string | null,
  leafLabel: string | null = null,
): Crumb[] {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/dashboard") return [{ label: "Overview" }];
  if (path === "/dashboard/prospects") return [{ label: "Prospects" }];
  if (path.startsWith("/dashboard/prospects/")) {
    // parts: ["", "dashboard", "prospects", id, sub?] - the hub segment
    // (Contacts/Settings) adds a trailing crumb; the name then links back to
    // the Demos default.
    const parts = path.split("/");
    const id = parts[3];
    const sub = parts[4];
    const name = dynamicLabel ?? "Prospect";
    if (!sub) {
      return [{ label: "Prospects", href: "/dashboard" }, { label: name }];
    }
    // In-context demo instance: /dashboard/prospects/{id}/demos/{configId} -
    // the demo name (leaf) is the terminal crumb; Demos links back to the grid.
    if (sub === "demos" && parts[5]) {
      return [
        { label: "Prospects", href: "/dashboard" },
        { label: name, href: `/dashboard/prospects/${id}` },
        { label: "Demos", href: `/dashboard/prospects/${id}/demos` },
        { label: leafLabel ?? "Demo" },
      ];
    }
    const subLabel =
      sub === "demos"
        ? "Demos"
        : sub === "contacts"
          ? "Contacts"
          : sub === "settings"
            ? "Settings"
            : titleCase(sub);
    return [
      { label: "Prospects", href: "/dashboard" },
      { label: name, href: `/dashboard/prospects/${id}` },
      { label: subLabel },
    ];
  }
  if (path.startsWith("/dashboard/")) {
    // Walk the segments under /dashboard, one crumb per level; the terminal
    // crumb is current, ancestors link.
    const parts = path.split("/").slice(2);
    const crumbs: Crumb[] = [];
    let acc = "/dashboard";
    parts.forEach((seg, i) => {
      acc += `/${seg}`;
      const isLast = i === parts.length - 1;
      // A dynamic terminal segment (e.g. a demo kind) names itself via context.
      const label =
        isLast && dynamicLabel
          ? dynamicLabel
          : (PATH_LABELS[acc] ?? SECTION_LABELS[seg] ?? titleCase(seg));
      crumbs.push(isLast ? { label } : { label, href: acc });
    });
    return crumbs;
  }
  if (path === "/documentation") return [{ label: "Documentation" }];
  if (path.startsWith("/documentation/")) {
    const seg = path.split("/")[2] ?? "";
    return [
      { label: "Documentation", href: "/documentation" },
      { label: dynamicLabel ?? DOC_TITLES[seg] ?? titleCase(seg) },
    ];
  }

  const seg = path.split("/")[1] ?? "";
  if (seg) return [{ label: SECTION_LABELS[seg] ?? titleCase(seg) }];
  return [{ label: "Workspace" }];
}

const BreadcrumbContext = createContext<{
  label: string | null;
  setLabel: (label: string | null) => void;
  leaf: string | null;
  setLeaf: (label: string | null) => void;
}>({ label: null, setLabel: () => {}, leaf: null, setLeaf: () => {} });

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  const [leaf, setLeaf] = useState<string | null>(null);
  return (
    <BreadcrumbContext.Provider value={{ label, setLabel, leaf, setLeaf }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

/** Server pages render this to name the terminal (dynamic) breadcrumb segment. */
export function SetBreadcrumb({ label }: { label: string }) {
  const { setLabel } = useContext(BreadcrumbContext);
  useEffect(() => {
    setLabel(label);
    return () => setLabel(null);
  }, [label, setLabel]);
  return null;
}

/**
 * Names the deepest crumb for a two-dynamic-segment route (e.g. a prospect's
 * demo instance), independent of the layout's own SetBreadcrumb prospect name.
 */
export function SetBreadcrumbLeaf({ label }: { label: string }) {
  const { setLeaf } = useContext(BreadcrumbContext);
  useEffect(() => {
    setLeaf(label);
    return () => setLeaf(null);
  }, [label, setLeaf]);
  return null;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const { label, leaf } = useContext(BreadcrumbContext);
  const trail = buildTrail(pathname ?? "/", label, leaf);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm">
        {trail.map((crumb, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden className="select-none text-muted-foreground">
                  /
                </span>
              )}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="truncate text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={`truncate ${
                    isLast
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
