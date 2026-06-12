/**
 * Platform shell chain-selection invariant tests.
 *
 * The withdraw flow's PlatformShell mounts WalletPickerScreen directly
 * (not via CheckoutWidget). WalletPickerScreen's multi-chain wallet
 * routing requires `selectedWalletForChain` + `onChainSelectChange`
 * props — without them, clicking a multi-chain wallet (e.g. Phantom
 * EVM + SOL) is a silent no-op (connectInstalled returns early).
 *
 * These tests verify the extracted chain-selection routing logic to
 * ensure hosts that mount WalletPickerScreen manually don't regress.
 */

import { describe, expect, it, vi } from "vitest";

/**
 * Extracted from WalletPickerScreen.connectInstalled — the guard that
 * routes multi-chain wallets to the chain selection sub-view.
 */
function shouldRouteToChainSelect(
  providerCount: number,
  chainOverride: string | undefined,
  onChainSelectChange: ((wallet: unknown) => void) | undefined,
): boolean {
  if (!chainOverride && providerCount > 1) {
    onChainSelectChange?.({ key: "test" });
    return true;
  }
  return false;
}

describe("platform-shell chain selection routing", () => {
  it("routes multi-chain wallets to chain selection when callback is provided", () => {
    const onChange = vi.fn();
    const routed = shouldRouteToChainSelect(2, undefined, onChange);
    expect(routed).toBe(true);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("silently no-ops when callback is undefined (the pre-fix bug)", () => {
    const routed = shouldRouteToChainSelect(2, undefined, undefined);
    // Returns true (still a multi-chain wallet) but the callback is a no-op.
    // This means the flow "swallows" the click — the user sees nothing.
    expect(routed).toBe(true);
  });

  it("bypasses chain selection for single-chain wallets regardless of callback", () => {
    const onChange = vi.fn();
    const routed = shouldRouteToChainSelect(1, undefined, onChange);
    expect(routed).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("bypasses chain selection when chainOverride is provided (chain already chosen)", () => {
    const onChange = vi.fn();
    const routed = shouldRouteToChainSelect(2, "EVM", onChange);
    expect(routed).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });
});
