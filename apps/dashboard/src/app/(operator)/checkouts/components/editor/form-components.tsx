/**
 * Form Helper Components
 *
 * Reusable form components for the widget config editor.
 */

import { Input } from "@dynamic-demos/ui";

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <div className="bg-white rounded-xl border border-[#e1e4ea] p-5">
      <h3 className="text-sm font-semibold text-[#0e121b] mb-3">{title}</h3>
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
      <h4 className="text-[11px] font-medium text-[#99a0ae] uppercase tracking-[0.48px] mb-2">
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
      <label className="block text-xs font-medium text-[#525866] mb-1">
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
        <label className="w-8 h-8 min-w-8 shrink-0 rounded-md border border-[#e1e4ea] cursor-pointer relative overflow-hidden">
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
          className="flex-1 min-w-0"
        />
      </div>
    </Field>
  );
}
