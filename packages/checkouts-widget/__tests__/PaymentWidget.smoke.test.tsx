// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

afterEach(() => cleanup());

// Mock the SDK wrappers used inside useCheckoutFlow so nothing reaches the real Dynamic API.
vi.mock("@/checkout-flow", () => ({
  createTransaction: vi.fn(),
  attachWalletSource: vi.fn(),
  getQuote: vi.fn(),
  getTransaction: vi.fn(),
  submit: vi.fn(),
  cancel: vi.fn(),
}));

import { PaymentWidget } from "@/PaymentWidget";

const requiredProps = {
  checkoutId: "ck_test",
  walletAccount: { address: "0xtest" } as any,
  currency: "USD",
  destinationAddress: "0xdest",
  destinationChain: "ETH" as any,
  fromToken: {
    address: "0xtoken",
    chainId: 1,
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin",
  },
  destinationToken: {
    address: "0xdesttoken",
    chainId: 1,
    symbol: "USDT",
    decimals: 6,
    name: "Tether",
  },
  needsConversion: true,
  isCrossChain: false,
};

describe("PaymentWidget", () => {
  it("renders the amount picker when `amount` is not supplied", () => {
    render(<PaymentWidget {...requiredProps} />);
    // DepositAmountScreen renders a "Deposit from wallet" header (see deposit-amount-screen.tsx)
    expect(screen.getByText(/deposit from wallet/i)).toBeDefined();
  });

  it("skips the amount picker when `amount` is supplied", () => {
    render(<PaymentWidget {...requiredProps} amount="100.00" />);
    // After mount it transitions to review. The amount-picker header should NOT be present.
    expect(screen.queryByText(/deposit from wallet/i)).toBeNull();
  });
});
