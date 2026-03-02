/**
 * Appearance Settings Section
 *
 * Handles theme customization, branding, and style settings.
 */

import { useState } from "react";
import { Input } from "@dynamic-demos/ui";
import { Select } from "@dynamic-demos/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Section, Subsection, ColorField } from "./form-components";
import { AiStyleImport } from "./ai-style-import";
import type {
  WidgetConfig,
  BorderRadiusSize,
  WidgetTheme,
  WidgetBranding,
} from "@/lib/widget-config";

interface AppearanceSettingsProps {
  config: WidgetConfig;
  updateTheme: (key: keyof WidgetTheme, value: string) => void;
  updateBranding: (key: keyof WidgetBranding, value: string | boolean) => void;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig | null>>;
  setToast: (message: string) => void;
}

export function AppearanceSettings({
  config,
  updateTheme,
  updateBranding,
  setConfig,
  setToast,
}: AppearanceSettingsProps) {
  const [themeJson, setThemeJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showJsonImport, setShowJsonImport] = useState(false);

  const theme = config.theme || {};
  const branding = config.branding || {};

  return (
    <Section title="Appearance">
      <AiStyleImport
        config={config}
        setConfig={setConfig}
        setToast={setToast}
      />
      {/* Branding */}
      <Subsection title="Branding">
        <Field label="Logo URL">
          <Input
            type="url"
            value={branding.logo || ""}
            onChange={(e) => updateBranding("logo", e.target.value)}
            placeholder="https://example.com/logo.svg"
          />
        </Field>
        <div className="mt-3">
          <Checkbox
            checked={branding.showPoweredBy !== false}
            onChange={(e) => updateBranding("showPoweredBy", e.target.checked)}
            label='Show "Powered by Dynamic" footer'
          />
        </div>
      </Subsection>

      {/* Colors */}
      <Subsection title="Colors">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ColorField
            label="Page Background"
            value={theme.pageBackground || "#f6f8fa"}
            onChange={(v) => updateTheme("pageBackground", v)}
          />
          <ColorField
            label="Widget Background"
            value={theme.background || "#ffffff"}
            onChange={(v) => updateTheme("background", v)}
          />
          <ColorField
            label="Text Color"
            value={theme.foreground || "#000000"}
            onChange={(v) => updateTheme("foreground", v)}
          />
          <ColorField
            label="Primary Button"
            value={theme.primaryColor || "#121212"}
            onChange={(v) => updateTheme("primaryColor", v)}
          />
          <ColorField
            label="Primary Hover"
            value={theme.primaryHoverColor || "#2a2a2a"}
            onChange={(v) => updateTheme("primaryHoverColor", v)}
          />
          <ColorField
            label="Accent Color"
            value={theme.accentColor || "#4779FF"}
            onChange={(v) => updateTheme("accentColor", v)}
          />
          <ColorField
            label="Muted Text"
            value={theme.mutedTextColor || "#9a9a9a"}
            onChange={(v) => updateTheme("mutedTextColor", v)}
          />
          <ColorField
            label="Row Background"
            value={theme.rowBackground || "#f6f8f8"}
            onChange={(v) => updateTheme("rowBackground", v)}
          />
          <ColorField
            label="Row Hover"
            value={theme.rowHoverBackground || "#eef1f1"}
            onChange={(v) => updateTheme("rowHoverBackground", v)}
          />
          <ColorField
            label="Border Color"
            value={theme.borderColor || "#e7e8ed"}
            onChange={(v) => updateTheme("borderColor", v)}
          />
          <ColorField
            label="Gradient From"
            value={theme.gradientFrom || "#daffff"}
            onChange={(v) => updateTheme("gradientFrom", v)}
          />
          <ColorField
            label="Gradient To"
            value={theme.gradientTo || "transparent"}
            onChange={(v) => updateTheme("gradientTo", v)}
          />
        </div>
      </Subsection>

      {/* Style */}
      <Subsection title="Style">
        <Field label="Border Radius">
          <Select
            value={theme.borderRadius || "md"}
            onChange={(e) =>
              updateTheme("borderRadius", e.target.value as BorderRadiusSize)
            }
          >
            <option value="xs">Extra Small</option>
            <option value="sm">Small</option>
            <option value="md">Medium (default)</option>
            <option value="lg">Large</option>
          </Select>
        </Field>
      </Subsection>

      {/* Advanced: JSON Import */}
      <div className="pt-3 border-t border-[#e1e4ea] mt-3">
        <button
          type="button"
          onClick={() => setShowJsonImport(!showJsonImport)}
          className="flex items-center gap-1.5 text-[11px] font-medium text-[#99a0ae] uppercase tracking-[0.48px] hover:text-[#525866] transition-colors cursor-pointer"
        >
          <svg
            className={`w-3 h-3 transition-transform ${
              showJsonImport ? "rotate-90" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          Advanced: Import Theme JSON
        </button>
        {showJsonImport && (
          <div className="mt-2 space-y-2">
            <textarea
              value={themeJson}
              onChange={(e) => {
                setThemeJson(e.target.value);
                setJsonError(null);
              }}
              placeholder={`{
  "pageBackground": "#000000",
  "background": "#0a0a0a",
  "foreground": "#ffffff",
  "primaryColor": "#a855f7",
  "accentColor": "#a855f7",
  "borderRadius": "lg"
}`}
              className="w-full h-32 px-2.5 py-2 border border-[#e1e4ea] rounded-md text-xs font-mono text-[#0e121b] placeholder:text-[#99a0ae] focus:outline-none focus:ring-1 focus:ring-[#335cff] focus:border-[#335cff] resize-none"
            />
            {jsonError && <p className="text-xs text-[#dc2626]">{jsonError}</p>}
            <button
              type="button"
              onClick={() => {
                try {
                  const parsed = JSON.parse(themeJson);
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          theme: { ...prev.theme, ...parsed },
                        }
                      : prev
                  );
                  setThemeJson("");
                  setShowJsonImport(false);
                  setToast("Theme applied");
                } catch {
                  setJsonError("Invalid JSON format");
                }
              }}
              disabled={!themeJson.trim()}
              className="px-3 py-1.5 bg-[#335cff] hover:bg-[#2850e8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs rounded-md transition-colors cursor-pointer"
            >
              Apply Theme
            </button>
          </div>
        )}
      </div>
    </Section>
  );
}
