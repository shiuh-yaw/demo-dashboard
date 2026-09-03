"use client";

import { type ButtonHTMLAttributes, type ReactNode, useEffect } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-brand-fg hover:bg-brand-hover disabled:bg-brand/50",
  secondary: "bg-card text-ink border border-line hover:bg-ground disabled:text-muted",
  ghost: "bg-transparent text-ink-2 hover:bg-ground disabled:text-muted",
  danger: "bg-down text-white hover:bg-[#b23232]",
};
const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-5 text-[15px] rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  loading,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {loading && <span className="spin inline-block h-3.5 w-3.5 rounded-full border-2 border-brand-fg/40 border-t-brand-fg" />}
      {children}
    </button>
  );
}

export function Badge({ tone = "neutral", children, className = "" }: { tone?: "neutral" | "brand" | "up" | "down" | "info" | "enclave"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-ground text-ink-2 border-line",
    brand: "bg-brand-2 text-brand border-brand/20",
    up: "bg-up-2 text-up border-up/20",
    down: "bg-down-2 text-down border-down/20",
    info: "bg-info-2 text-info border-info/20",
    enclave: "bg-enclave-2 text-enclave border-enclave/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`exchange-card p-5 ${className}`}>{children}</section>;
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-muted ${className}`}>{children}</p>;
}

/** Bottom/side sheet used for every in-app action. One component, one motion. */
export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className={`rise relative w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-line max-h-[92vh] overflow-y-auto`}>
        <header className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-ground text-muted" aria-label="Close">
            ×
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-ink-2 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[12px] text-muted mt-1.5">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full h-11 rounded-xl border border-line bg-card px-3.5 text-[15px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 placeholder:text-muted/70";

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`spin inline-block h-4 w-4 rounded-full border-2 border-line border-t-brand ${className}`} />;
}

export function ErrorNote({ message, onDismiss }: { message: string | null; onDismiss?: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-down-2 text-down px-3.5 py-2.5 text-[13px]">
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="font-semibold" aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

/** Shows an address only when the script has chosen to reveal it. */
export function Address({ value, revealed, className = "" }: { value: string; revealed: boolean; className?: string }) {
  if (!revealed) return <span className={`text-muted ${className}`}>Exchange account</span>;
  return <span className={`mono text-[13px] ${className}`}>{value}</span>;
}

export const Icon = {
  Google: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4.1-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4.1 3.1A7.2 7.2 0 0 1 12 4.8Z" />
    </svg>
  ),
  Apple: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="currentColor" d="M16.4 12.6c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.8 1.3 10.3.9 1.3 1.9 2.7 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.3 3.1-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.8-1.1-2.8-4Zm-2.6-7.5c.7-.9 1.2-2 1-3.2-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1.1 3 1.1.1 2.3-.5 3-1.3Z" />
    </svg>
  ),
  Shield: ({ className = "h-4 w-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  Phone: ({ className = "h-4 w-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  ),
  Fox: ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#E2761B" d="M21 3l-7.5 5.5 1.4-3.3L21 3z" />
      <path fill="#E4761B" d="M3 3l7.4 5.6-1.3-3.4L3 3zm15.2 13.1l-2 3.1 4.3 1.2 1.2-4.2-3.5-.1zM2.3 16.2l1.2 4.2 4.3-1.2-2-3.1-3.5.1z" />
      <path fill="#F6851B" d="M7.4 10.7l-1.2 1.8 4.2.2-.1-4.6-2.9 2.6zm9.2 0l-3-2.6-.1 4.6 4.3-.2-1.2-1.8zM7.8 19.2l2.6-1.3-2.2-1.7-.4 3zm5.8-1.3l2.6 1.3-.4-3-2.2 1.7z" />
    </svg>
  ),
};
