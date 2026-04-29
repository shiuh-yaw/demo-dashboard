"use client";

import type { ReactNode } from "react";
import { SparkBolt } from "../ui/SparkBolt.js";
import { StepIndicator } from "./StepIndicator.js";

export function Panel({
  step,
  children,
}: {
  step?: number;
  children: ReactNode;
}) {
  return (
    <div className="card space-y-5">
      {step !== undefined && step > 0 && <StepIndicator current={step} />}
      {children}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-[var(--color-blue)]">
      <SparkBolt size={36} animated />
      {label && (
        <p className="text-sm text-[color-mix(in_srgb,var(--color-blue-100)_65%,transparent)]">
          {label}
        </p>
      )}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full cursor-pointer rounded-xl px-5 py-3.5 bg-[var(--color-blue-400)] text-white font-semibold tracking-tight transition-colors duration-150 hover:bg-[var(--color-blue)] active:bg-[var(--color-blue-400)] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer rounded-xl px-5 py-3 text-sm font-medium text-[color-mix(in_srgb,var(--color-blue-100)_70%,transparent)] border border-[var(--color-navy-line)] bg-transparent hover:text-[var(--color-blue-100)] hover:bg-white/5 hover:border-[color-mix(in_srgb,var(--color-blue-100)_25%,var(--color-navy-line))] transition-colors"
    >
      {children}
    </button>
  );
}
