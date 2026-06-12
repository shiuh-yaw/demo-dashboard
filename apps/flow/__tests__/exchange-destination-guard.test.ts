/**
 * Exchange destination address guard tests.
 *
 * Covers:
 * - Transfer execution rejects when no destination address is resolved
 * - Transfer proceeds when a valid destination address is available
 * - exchangeDestinationAddress ?? widgetProps.destinationAddress fallback
 */

import { describe, expect, it } from "vitest";

/**
 * Extracted destination resolution logic from exchange-checkout-widget.tsx
 * (lines 282-289). Testing the guard in isolation avoids needing to mount
 * the full React component tree with all its SDK dependencies.
 */
function resolveExchangeDestination(
  exchangeDestinationAddress: string | undefined,
  widgetDestinationAddress: string,
): string {
  const destinationAddress =
    exchangeDestinationAddress ?? widgetDestinationAddress;

  if (!destinationAddress) {
    throw new Error(
      "No destination address available. Connect a wallet first.",
    );
  }

  return destinationAddress;
}

describe("exchange destination address guard", () => {
  describe("resolveExchangeDestination", () => {
    it("uses exchangeDestinationAddress when provided", () => {
      const result = resolveExchangeDestination(
        "0xABC123",
        "0xFALLBACK",
      );
      expect(result).toBe("0xABC123");
    });

    it("falls through to widgetDestinationAddress when exchangeDestinationAddress is undefined", () => {
      const result = resolveExchangeDestination(
        undefined,
        "0xFALLBACK",
      );
      expect(result).toBe("0xFALLBACK");
    });

    it("throws when both addresses are empty (exchange OAuth flow, no wallet connected)", () => {
      expect(() => resolveExchangeDestination(undefined, "")).toThrow(
        "No destination address available. Connect a wallet first.",
      );
    });

    it("throws when exchangeDestinationAddress is undefined and widget address is empty string", () => {
      expect(() => resolveExchangeDestination(undefined, "")).toThrow(
        "No destination address available",
      );
    });

    it("does NOT fall through on empty string exchangeDestinationAddress (nullish coalescing only triggers on null/undefined)", () => {
      // Empty string is NOT nullish, so ?? does NOT fall through to
      // "0xFALLBACK". The resolved address is "" which is falsy → guard throws.
      // This verifies why we pass `walletAddress || undefined` from the host.
      expect(() => resolveExchangeDestination("", "0xFALLBACK")).toThrow(
        "No destination address available",
      );
    });

    it("accepts any valid non-empty address string", () => {
      const evm = resolveExchangeDestination(
        "0x5C260969b90152a46D52BC476C94524C8E796b3d",
        "",
      );
      expect(evm).toBe("0x5C260969b90152a46D52BC476C94524C8E796b3d");

      const sol = resolveExchangeDestination(
        "7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q",
        "",
      );
      expect(sol).toBe("7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q");
    });
  });

  describe("walletAddress || undefined pattern", () => {
    it("converts empty string to undefined (enabling ?? fallthrough)", () => {
      const walletAddress = "";
      const prop = walletAddress || undefined;
      expect(prop).toBeUndefined();
    });

    it("preserves valid address (no conversion needed)", () => {
      const walletAddress = "0xABC123";
      const prop = walletAddress || undefined;
      expect(prop).toBe("0xABC123");
    });
  });
});
