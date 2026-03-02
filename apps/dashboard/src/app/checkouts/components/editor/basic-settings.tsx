/**
 * Basic Settings Section
 *
 * Handles mode selection, payment/deposit configuration, and recipient addresses.
 */

import { Input } from "@dynamic-demos/ui";
import { Select } from "@dynamic-demos/ui";
import { Field, Section } from "./form-components";
import type { WidgetConfig } from "@/lib/widget-config";

interface BasicSettingsProps {
  config: WidgetConfig;
  updateConfig: <K extends keyof WidgetConfig>(
    key: K,
    value: WidgetConfig[K]
  ) => void;
}

export function BasicSettings({ config, updateConfig }: BasicSettingsProps) {
  return (
    <Section title="Basic Settings">
      <Field label="Mode">
        <Select
          value={config.mode}
          onChange={(e) =>
            updateConfig("mode", e.target.value as "payment" | "deposit")
          }
        >
          <option value="deposit">Deposit (user enters amount)</option>
          <option value="payment">Payment (fixed amount)</option>
        </Select>
      </Field>

      {/* Payment mode specific fields */}
      {config.mode === "payment" && (
        <>
          <Field label="Payment Amount (USD)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={config.defaultPaymentAmount ?? ""}
              onChange={(e) =>
                updateConfig(
                  "defaultPaymentAmount",
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              placeholder="5.00"
            />
          </Field>
          <Field label="Recipient Address">
            <Input
              value={config.recipientAddress || ""}
              onChange={(e) => updateConfig("recipientAddress", e.target.value)}
              placeholder="0x..."
              mono
            />
          </Field>
        </>
      )}

      {/* Deposit mode specific fields */}
      {config.mode === "deposit" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min Amount (USD)">
              <Input
                type="number"
                step="any"
                min="0"
                value={config.minDepositAmount ?? ""}
                onChange={(e) =>
                  updateConfig(
                    "minDepositAmount",
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                placeholder="1"
              />
            </Field>
            <Field label="Max Amount (USD)">
              <Input
                type="number"
                step="any"
                min="0"
                value={config.maxDepositAmount ?? ""}
                onChange={(e) =>
                  updateConfig(
                    "maxDepositAmount",
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                placeholder="10000"
              />
            </Field>
          </div>
          <Field label="Quick Presets (up to 4)">
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Input
                  key={i}
                  type="number"
                  step="any"
                  min="0"
                  value={config.depositPresets?.[i] ?? ""}
                  onChange={(e) => {
                    const presets = [...(config.depositPresets || [])];
                    if (e.target.value) {
                      presets[i] = parseFloat(e.target.value);
                    } else {
                      presets[i] = 0;
                    }
                    const filtered = presets.filter((p) => p > 0);
                    updateConfig("depositPresets", filtered);
                  }}
                  placeholder={["50", "100", "500", "1000"][i]}
                  className="text-center"
                />
              ))}
            </div>
          </Field>

          {/* Deposit Destination */}
          <Field label="Deposit Destination">
            <div className="flex rounded-lg bg-[#f5f7fa] p-1 gap-1">
              <button
                type="button"
                onClick={() => updateConfig("depositDestination", "fixed")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  (config.depositDestination ?? "fixed") === "fixed"
                    ? "bg-white text-[#0e121b] shadow-sm"
                    : "text-[#525866] hover:text-[#0e121b]"
                }`}
              >
                Fixed Address
              </button>
              <button
                type="button"
                onClick={() => updateConfig("depositDestination", "embedded")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  config.depositDestination === "embedded"
                    ? "bg-white text-[#0e121b] shadow-sm"
                    : "text-[#525866] hover:text-[#0e121b]"
                }`}
              >
                Embedded Wallet
              </button>
            </div>
          </Field>

          {/* Fixed address input */}
          {(config.depositDestination ?? "fixed") === "fixed" && (
            <Field label="Deposit Address">
              <Input
                value={config.recipientAddress || ""}
                onChange={(e) =>
                  updateConfig("recipientAddress", e.target.value)
                }
                placeholder="0x..."
                mono
              />
            </Field>
          )}

          {/* Embedded wallet info */}
          {config.depositDestination === "embedded" && (
            <div className="flex items-start gap-3 p-3 bg-[#f0f7ff] border border-[#bfdbfe] rounded-lg">
              <div className="w-8 h-8 rounded-full bg-[#335cff] flex items-center justify-center shrink-0 mt-0.5">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-[#1e40af]">
                  Dynamic Embedded Wallet
                </p>
                <p className="text-xs text-[#3b82f6] mt-0.5">
                  Deposits will be sent directly to each user&apos;s embedded
                  wallet.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </Section>
  );
}
