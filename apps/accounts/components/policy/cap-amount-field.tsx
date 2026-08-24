"use client";

/**
 * "Up to N of X" - the asset on the left, the amount on the right.
 *
 * Two controls on one line because they are one statement; splitting them onto
 * separate rows made the unit read as a second, unrelated setting. Picking
 * `Custom token` grows a second row for the contract address, which is the only
 * time this field is taller than one line.
 */

import { Input, SelectMenu } from "@dynamic-demos/ui";
import type { CapAmount } from "@/hooks/use-cap-amount";
import type { CapAsset } from "@/lib/cap-assets";
import { CUSTOM_ASSET_KEY, assetKeyOf } from "@/lib/cap-value";

/** Symbol with its icon, shared by the trigger and the open list. */
function AssetLabel({ asset }: { asset: CapAsset }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {asset.iconUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.iconUrl}
          alt=""
          aria-hidden="true"
          className="h-4 w-4 shrink-0 rounded-full"
        />
      )}
      <span className="truncate">{asset.symbol}</span>
    </span>
  );
}

export function CapAmountField({
  assets,
  state,
  disabled = false,
  placeholder = "No cap",
  label,
  helperText,
}: {
  assets: readonly CapAsset[];
  state: CapAmount;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  helperText?: string;
}) {
  const options = [
    ...assets.map((asset) => ({
      value: assetKeyOf(asset),
      label: <AssetLabel asset={asset} />,
      description: asset.name,
    })),
    {
      value: CUSTOM_ASSET_KEY,
      label: "Custom token",
      // The trigger is sized for a ticker, so it says "Custom"; the open list
      // has room for the whole thing.
      triggerLabel: "Custom",
    },
  ];

  // The one thing this control does not say for itself: a cap binds ONE asset.
  // A limit on the native coin leaves token transfers untouched, because a
  // token transfer moves no native value at all.
  const scopeNote = state.amount.trim()
    ? `Limits ${state.symbol} only. Another asset needs a rule of its own.`
    : null;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium text-(--brand-fg)">{label}</span>
      )}

      <div className="flex items-start gap-2">
        <div className="w-[7.5rem] shrink-0">
          <SelectMenu
            className="h-10"
            aria-label="Asset"
            value={state.assetKey}
            options={options}
            onChange={state.setAssetKey}
            disabled={disabled}
          />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            aria-label="Amount"
            noAutofill
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={state.amount}
            onChange={(event) => state.setAmount(event.target.value)}
            placeholder={placeholder}
            mono
            disabled={disabled}
          />
        </div>
      </div>

      {state.isCustom && (
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Input
              aria-label="Token contract address"
              noAutofill
              value={state.customAddress}
              onChange={(event) => state.setCustomAddress(event.target.value)}
              placeholder="Token contract address"
              mono
              disabled={disabled}
            />
          </div>
          <div className="w-[4.5rem] shrink-0">
            <Input
              aria-label="Token decimals"
              noAutofill
              type="number"
              inputMode="numeric"
              min="0"
              max="36"
              step="1"
              value={state.customDecimals}
              onChange={(event) => state.setCustomDecimals(event.target.value)}
              placeholder="18"
              mono
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {state.isCustom && (
        <p className="text-[11px] leading-relaxed text-(--brand-muted)">
          Contract address and how many decimals it uses - 18 for most tokens, 6
          for USDC.
        </p>
      )}

      {(scopeNote || helperText) && (
        <p className="text-[11px] leading-relaxed text-(--brand-muted)">
          {[scopeNote, helperText].filter(Boolean).join(" ")}
        </p>
      )}
    </div>
  );
}
