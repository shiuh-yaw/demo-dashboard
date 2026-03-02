import { Terminal, ExternalLink } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

// ---------------------------------------------------------------------------
// API Flow Steps
// ---------------------------------------------------------------------------

export function ApiStepList({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

export function ApiStep({
  step,
  title,
  endpoint,
  description,
  children,
}: {
  step: number;
  title: string;
  endpoint: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xs font-semibold text-blue-700">
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-900 mb-1">{title}</p>
        <div className="mb-1">
          <EndpointBadge block>{endpoint}</EndpointBadge>
        </div>
        {description && (
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}

export function CollapsibleCodeBlock({
  label,
  children,
  defaultOpen,
}: {
  label: string;
  children: string;
  defaultOpen?: boolean;
}) {
  return (
    <details className="mt-2" open={defaultOpen ?? label === "Request Body"}>
      <summary className="cursor-pointer text-xs text-slate-700 font-medium">
        {label}
      </summary>
      <CodeBlock className="mt-2">{children}</CodeBlock>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export function DocSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 p-5 ${className ?? ""}`}
    >
      {title && (
        <h3 className="text-sm font-semibold text-slate-900 mb-3">{title}</h3>
      )}
      {children}
    </div>
  );
}

export function CodeBlock({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <pre
      className={`bg-slate-800 text-slate-100 p-3 rounded-md overflow-x-auto text-xs font-mono ${className ?? ""}`}
    >
      {children}
    </pre>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs">
      {children}
    </code>
  );
}

export function EndpointBadge({
  children,
  block,
}: {
  children: string;
  block?: boolean;
}) {
  return (
    <code
      className={`bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-mono ${block ? "block" : ""}`}
    >
      {children}
    </code>
  );
}

export function StatusPill({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-md font-mono text-xs text-slate-700">
      <Terminal className="w-3.5 h-3.5" />
      <span>{children}</span>
    </div>
  );
}

export function DocLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
    >
      <ExternalLink className="w-3.5 h-3.5" />
      {children}
    </Link>
  );
}

export function DocLinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      className="inline-flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group"
    >
      <div>
        <div className="text-xs font-medium text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
    </Link>
  );
}
