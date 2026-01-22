/**
 * Product Settings Section
 *
 * Payment mode specific settings for product branding and payment page colors.
 */

import { Input } from "@/components/ui/input";
import { Field, Section, Subsection, ColorField } from "./form-components";
import type {
  WidgetConfig,
  PaymentPageConfig,
  WidgetBranding,
} from "@/lib/widget-config";

interface ProductSettingsProps {
  config: WidgetConfig;
  updateBranding: (key: keyof WidgetBranding, value: string | boolean) => void;
  updatePaymentPage: (key: keyof PaymentPageConfig, value: string) => void;
}

export function ProductSettings({
  config,
  updateBranding,
  updatePaymentPage,
}: ProductSettingsProps) {
  if (config.mode !== "payment") return null;

  const branding = config.branding || {};

  return (
    <Section title="Product Settings">
      <Field label="Brand Name">
        <Input
          value={branding.name || ""}
          onChange={(e) => updateBranding("name", e.target.value)}
          placeholder="Your Brand Name"
        />
      </Field>
      <Field label="Product Image URL">
        <Input
          type="url"
          value={config.paymentPage?.productImage || ""}
          onChange={(e) => updatePaymentPage("productImage", e.target.value)}
          placeholder="https://example.com/product.jpg"
        />
      </Field>

      <Subsection title="Payment Page Colors">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ColorField
            label="Left Panel Background"
            value={config.paymentPage?.leftPanelBackground || "#151515"}
            onChange={(v) => updatePaymentPage("leftPanelBackground", v)}
          />
          <ColorField
            label="Left Panel Text"
            value={config.paymentPage?.leftPanelTextColor || "#ffffff"}
            onChange={(v) => updatePaymentPage("leftPanelTextColor", v)}
          />
          <ColorField
            label="Left Panel Muted"
            value={config.paymentPage?.leftPanelMutedColor || "#8e8e8e"}
            onChange={(v) => updatePaymentPage("leftPanelMutedColor", v)}
          />
          <ColorField
            label="Right Panel Background"
            value={config.paymentPage?.rightPanelBackground || "#f8f8f8"}
            onChange={(v) => updatePaymentPage("rightPanelBackground", v)}
          />
        </div>
      </Subsection>
    </Section>
  );
}
