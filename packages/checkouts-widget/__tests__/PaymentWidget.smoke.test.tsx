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
    // DepositAmountScreen renders an "Enter an amount" header
    // (see deposit-amount-screen.tsx — normalized to eyebrow + title).
    expect(screen.getByText(/enter an amount/i)).toBeDefined();
  });

  it("skips the amount picker when `amount` is supplied", () => {
    render(<PaymentWidget {...requiredProps} amount="100.00" />);
    // After mount it transitions to review. The amount-picker header should NOT be present.
    expect(screen.queryByText(/enter an amount/i)).toBeNull();
  });

  // The review/loading skeleton renders a "Destination" row by default.
  // `hideDestination` is the merchant-flow opt-out: buyers don't need to
  // see the merchant's settlement vault.
  it("renders the Destination row in the review loading state by default", () => {
    render(<PaymentWidget {...requiredProps} amount="100.00" />);
    expect(screen.getByText(/destination/i)).toBeDefined();
  });

  it("hides the Destination row when `hideDestination` is set", () => {
    render(
      <PaymentWidget {...requiredProps} amount="100.00" hideDestination />,
    );
    expect(screen.queryByText(/destination/i)).toBeNull();
  });
});
