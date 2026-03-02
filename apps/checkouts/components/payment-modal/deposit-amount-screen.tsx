"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@dynamic-demos/utils";
import { DollarCircleIcon } from "@/components/icons";
import ScreenHeader from "./screen-header";
import { Button } from "@dynamic-demos/ui";
import {
  DEPOSIT_PRESETS,
  DEPOSIT_MIN_AMOUNT,
  DEPOSIT_MAX_AMOUNT,
} from "@/lib/config";

interface DepositAmountScreenProps {
  /** Preset amounts for quick selection */
  presets?: number[];
  /** Minimum deposit amount */
  minAmount?: number;
  /** Maximum deposit amount */
  maxAmount?: number;
  /** Called when user confirms the deposit amount */
  onConfirm?: (amount: number) => void;
}

export default function DepositAmountScreen({
  presets = DEPOSIT_PRESETS,
  minAmount = DEPOSIT_MIN_AMOUNT,
  maxAmount = DEPOSIT_MAX_AMOUNT,
  onConfirm,
}: DepositAmountScreenProps) {
  const [amount, setAmount] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const numericAmount = parseFloat(amount) || 0;
  const isBelowMin = numericAmount > 0 && numericAmount < minAmount;
  const isAboveMax = numericAmount > maxAmount;
  const isValidAmount = !isBelowMin && !isAboveMax;
  const canConfirm = numericAmount > 0 && isValidAmount;

  // Validation message
  const getValidationMessage = (): string | null => {
    if (isBelowMin) return `Minimum amount is $${minAmount}`;
    if (isAboveMax) return `Maximum amount is $${maxAmount.toLocaleString()}`;
    return null;
  };
  const validationMessage = getValidationMessage();

  const handlePresetClick = useCallback((preset: number) => {
    setAmount(preset.toString());
    setSelectedPreset(preset);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Allow empty, digits, and one decimal point
      if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
        setAmount(value);
        setSelectedPreset(null);
      }
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    if (canConfirm) {
      onConfirm?.(numericAmount);
    }
  }, [canConfirm, numericAmount, onConfirm]);

  const formatDisplayAmount = () => {
    if (!amount) return "$0";

    // Preserve the exact input while typing (including trailing decimal/zeros)
    // This allows users to see "1." or "1.5" as they type
    const parts = amount.split(".");
    const integerPart = parts[0] || "0";
    const formattedInteger = parseInt(integerPart, 10).toLocaleString();

    if (parts.length === 2) {
      // Has decimal point - preserve it and any digits after
      return `$${formattedInteger}.${parts[1]}`;
    }

    return `$${formattedInteger}`;
  };

  return (
    <div className="flex flex-col">
      <ScreenHeader
        icon={<DollarCircleIcon size={18} className="text-(--widget-fg)" />}
        title="Deposit from wallet"
        subtitle="Enter an amount you want to deposit"
      />

      {/* Amount Input Area */}
      <div className="flex flex-col gap-2 items-center justify-center p-3">
        <div
          onClick={handleContainerClick}
          className={cn(
            "w-full h-[127px] flex items-center justify-center",
            "bg-(--widget-row-bg) rounded-(--widget-radius)",
            "relative cursor-text",
          )}
        >
          {/* Hidden input for keyboard input */}
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canConfirm) {
                handleConfirm();
              }
            }}
            placeholder="0"
            className="absolute inset-0 w-full h-full opacity-0 cursor-text"
          />
          {/* Display amount with cursor */}
          <span
            className={cn(
              "text-[31px] font-medium tracking-[-0.31px] flex items-center pointer-events-none",
              amount ? "text-(--widget-fg)" : "text-(--widget-muted)",
            )}
          >
            {formatDisplayAmount()}
            {isFocused && (
              <span className="w-[2px] h-8 bg-(--widget-accent) ml-0.5 animate-pulse" />
            )}
          </span>
        </div>

        {/* Preset Badges */}
        <div className="flex gap-2 items-center">
          {presets.map((preset, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={cn(
                "px-2 py-1 rounded-[30px] text-[11px] font-medium leading-4",
                "transition-colors cursor-pointer",
                selectedPreset === preset
                  ? "bg-(--widget-row-hover) text-(--widget-primary)"
                  : "bg-(--widget-row-bg) text-(--widget-muted) hover:bg-(--widget-row-hover)",
              )}
            >
              ${preset.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Validation Message */}
        {validationMessage && (
          <span className="text-xs text-red-500 tracking-[-0.12px]">
            {validationMessage}
          </span>
        )}
      </div>

      {/* Footer Button */}
      <div className="p-3 border-t border-(--widget-border)">
        <Button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="w-full"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
