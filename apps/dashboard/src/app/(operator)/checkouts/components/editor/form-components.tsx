/**
 * Form Helper Components
 *
 * Reusable form components for the widget config editor.
 */

import { Input } from "@dynamic-demos/ui";
import { suppressAutofill } from "@/lib/suppress-autofill";

interface SectionProps {
  title: string;
  /** One-line muted subtitle under the title - omitted by default. */
  description?: string;
  children: React.ReactNode;
}

export function Section({ title, description, children }: SectionProps) {
  // Operator dark tokens layer on top of the light hex via `dark:` only.
  return (
    <div className="bg-white dark:bg-card rounded-xl border border-[#e1e4ea] dark:border-border p-5">
      <h3
        className={`text-sm font-semibold text-[#0e121b] dark:text-foreground ${description ? "mb-0.5" : "mb-3"}`}
      >
        {title}
      </h3>
      {description && (
        <p className="mb-3 text-xs text-[#99a0ae] dark:text-muted-foreground">
          {description}
        </p>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

interface SubsectionProps {
  title: string;
  children: React.ReactNode;
}

export function Subsection({ title, children }: SubsectionProps) {
  return (
    <div className="pt-3 first:pt-0">
      <h4 className="text-[11px] font-medium text-[#99a0ae] dark:text-muted-foreground uppercase tracking-[0.48px] mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <div className="min-w-0">
      <label className="block text-xs font-medium text-[#525866] dark:text-muted-foreground mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <label className="w-8 h-8 min-w-8 shrink-0 rounded-md border border-[#e1e4ea] dark:border-border cursor-pointer relative overflow-hidden">
          <input
            type="color"
            value={value.startsWith("#") ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-[150%] h-[150%] -top-1 -left-1 cursor-pointer appearance-none border-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:border-none"
          />
        </label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          mono
          className="flex-1 min-w-0 dark:bg-background dark:text-foreground dark:border-border dark:placeholder:text-muted-foreground"
          {...suppressAutofill}
        />
      </div>
    </Field>
  );
}
