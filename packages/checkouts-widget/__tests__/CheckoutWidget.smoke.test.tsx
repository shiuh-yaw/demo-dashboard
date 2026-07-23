// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

afterEach(() => cleanup());

// Mock the SDK so nothing reaches the network. CheckoutWidget pulls
// the primary wallet on mount via getPrimaryWalletAccount; returning
// null keeps the widget in the "connect" stage so we can assert on
// the picker header.
vi.mock("@dynamic-labs-sdk/client", async () => {
  const actual = await vi.importActual<
    typeof import("@dynamic-labs-sdk/client")
  >("@dynamic-labs-sdk/client");
  return {
    ...actual,
    getPrimaryWalletAccount: vi.fn(() => null),
    getAvailableWalletProvidersData: vi.fn(() => []),
    onEvent: vi.fn(),
    offEvent: vi.fn(),
    connectAndVerifyWithWalletProvider: vi.fn(),
    connectWithWalletProvider: vi.fn(),
  };
});

vi.mock("@dynamic-labs-sdk/evm/wallet-connect", () => ({
  connectAndVerifyWithWalletConnectEvm: vi.fn(),
  connectWithWalletConnectEvm: vi.fn(),
}));

vi.mock("@dynamic-labs-sdk/solana/wallet-connect", () => ({
  connectAndVerifyWithWalletConnectSolana: vi.fn(),
  connectWithWalletConnectSolana: vi.fn(),
}));

vi.mock("@/checkout-flow", () => ({
  createTransaction: vi.fn(),
  attachWalletSource: vi.fn(),
  getQuote: vi.fn(),
  getTransaction: vi.fn(),
  submit: vi.fn(),
  cancel: vi.fn(),
}));

import { CheckoutWidget } from "@/CheckoutWidget";

const requiredProps = {
  checkoutId: "ck_test",
  currency: "USD",
  destinationAddress: "0x5C260969b90152a46D52BC476C94524C8E796b3d",
  destinationChain: "EVM",
  destinationToken: {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    chainId: 8453,
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin",
  },
};

describe("CheckoutWidget", () => {
  it("starts at the wallet picker stage when no wallet is connected", () => {
    render(<CheckoutWidget {...requiredProps} />);
    // Default picker header copy.
    expect(screen.getByText(/connect a wallet/i)).toBeDefined();
    expect(screen.getByText(/pick how you'll pay/i)).toBeDefined();
  });

  it("renders the Powered-by footer by default and hides it on opt-out", () => {
    const { rerender } = render(<CheckoutWidget {...requiredProps} />);
    expect(screen.getByText(/powered by/i)).toBeDefined();

    rerender(<CheckoutWidget {...requiredProps} hidePoweredBy />);
    expect(screen.queryByText(/powered by/i)).toBeNull();
  });

  it("renders Terms + Privacy legal links by default", () => {
    render(<CheckoutWidget {...requiredProps} />);
    const terms = screen.getByRole("link", { name: /terms of service/i });
    const privacy = screen.getByRole("link", { name: /privacy policy/i });
    expect(terms.getAttribute("href")).toBe(
      "https://www.dynamic.xyz/terms-conditions",
    );
    expect(privacy.getAttribute("href")).toBe(
      "https://www.dynamic.xyz/privacy-policy",
    );
  });

  it("hides legal links when hideLegalLinks is set", () => {
    render(<CheckoutWidget {...requiredProps} hideLegalLinks />);
    expect(screen.queryByRole("link", { name: /terms of service/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /privacy policy/i })).toBeNull();
  });

  it("accepts custom legal links", () => {
    render(
      <CheckoutWidget
        {...requiredProps}
        legalLinks={[
          { label: "Acme TOS", href: "https://acme.example/tos" },
        ]}
      />,
    );
    const link = screen.getByRole("link", { name: /acme tos/i });
    expect(link.getAttribute("href")).toBe("https://acme.example/tos");
    // Default links should NOT also render.
    expect(screen.queryByRole("link", { name: /terms of service/i })).toBeNull();
  });

  it("renders the amount picker first when `amountFirst` is set", () => {
    render(<CheckoutWidget {...requiredProps} amountFirst />);
    // DepositAmountScreen header copy.
    expect(screen.getByText(/enter an amount/i)).toBeDefined();
    // Wallet picker header should NOT yet be visible.
    expect(screen.queryByText(/pick how you'll pay/i)).toBeNull();
  });

  it("ignores `amountFirst` when `amount` is supplied", () => {
    render(<CheckoutWidget {...requiredProps} amount="50.00" amountFirst />);
    // Skips the amount stage entirely and goes straight to wallet picker.
    expect(screen.queryByText(/enter an amount/i)).toBeNull();
    expect(screen.getByText(/pick how you'll pay/i)).toBeDefined();
  });

  it("accepts a custom wallet-picker header", () => {
    render(
      <CheckoutWidget
        {...requiredProps}
        walletPickerHeader={<span>Custom header copy</span>}
      />,
    );
    expect(screen.getByText("Custom header copy")).toBeDefined();
    // Default copy should not render when a custom header is supplied.
    expect(screen.queryByText(/pick how you'll pay/i)).toBeNull();
  });

  it("renders walletPickerOverride in place of the wallet list", () => {
    render(
      <CheckoutWidget
        {...requiredProps}
        amount="1.00"
        walletPickerOverride={<div>CATEGORY ROWS</div>}
      />,
    );
    expect(screen.getByText("CATEGORY ROWS")).toBeTruthy();
    // Default picker header should NOT render when the override is supplied.
    expect(screen.queryByText(/pick how you'll pay/i)).toBeNull();
  });

  it("renders the wallet list when walletPickerOverride is omitted", () => {
    render(<CheckoutWidget {...requiredProps} amount="1.00" />);
    expect(screen.queryByText("CATEGORY ROWS")).toBeNull();
    expect(screen.getByText(/pick how you'll pay/i)).toBeDefined();
  });
});
