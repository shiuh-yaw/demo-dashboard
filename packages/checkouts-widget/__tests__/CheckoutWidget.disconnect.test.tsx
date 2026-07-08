// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";

afterEach(() => cleanup());

const MOCK_WALLET_ADDRESS = "0xD3adB33fCaf3B4d07E5C7B2e123F8a0C9eA5bD12";

// Mock SDK — getPrimaryWalletAccount returns a wallet so we can test
// whether skipAutoConnect actually prevents auto-picking.
vi.mock("@dynamic-labs-sdk/client", async () => {
  const actual = await vi.importActual<
    typeof import("@dynamic-labs-sdk/client")
  >("@dynamic-labs-sdk/client");
  return {
    ...actual,
    getPrimaryWalletAccount: vi.fn(() => ({
      address: MOCK_WALLET_ADDRESS,
      chain: "EVM",
      id: "wallet-1",
      key: "metamask",
      name: "MetaMask",
    })),
    getAvailableWalletProvidersData: vi.fn(() => []),
    getBalances: vi.fn(() => Promise.resolve({})),
    getNetworksData: vi.fn(() => []),
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

describe("CheckoutWidget — skipAutoConnect + disconnect", () => {
  it("auto-picks the connected wallet by default (skipAutoConnect=false)", () => {
    render(<CheckoutWidget {...requiredProps} />);
    // With a wallet auto-picked, the asset selector renders instead of
    // the wallet picker. The asset selector header says "Pick a token".
    expect(screen.queryByText(/connect a wallet/i)).toBeNull();
    expect(screen.getByText(/pick a token/i)).toBeDefined();
  });

  it("shows wallet picker even when a wallet is already connected when skipAutoConnect is true", () => {
    render(<CheckoutWidget {...requiredProps} skipAutoConnect />);
    // skipAutoConnect prevents auto-picking — wallet picker is shown.
    expect(screen.getByText(/connect a wallet/i)).toBeDefined();
    expect(screen.queryByText(/pick a token/i)).toBeNull();
  });

  it("renders the disconnect button with the truncated address in the asset selector", () => {
    render(<CheckoutWidget {...requiredProps} />);
    // Auto-picked → asset selector stage → disconnect button visible.
    const disconnectBtn = screen.getByRole("button", {
      name: /disconnect wallet/i,
    });
    expect(disconnectBtn).toBeDefined();
  });

  it("renders the wallet address pill in the asset selector header", () => {
    render(<CheckoutWidget {...requiredProps} />);
    // The address is truncated (e.g. "0xD3ad…bD12").
    const truncated = `${MOCK_WALLET_ADDRESS.slice(0, 6)}...${MOCK_WALLET_ADDRESS.slice(-4)}`;
    expect(screen.getByText(truncated)).toBeDefined();
  });

  it("fires onDisconnect and returns to wallet picker when disconnect button is clicked", () => {
    const onDisconnect = vi.fn();
    render(<CheckoutWidget {...requiredProps} onDisconnect={onDisconnect} />);

    const disconnectBtn = screen.getByRole("button", {
      name: /disconnect wallet/i,
    });
    fireEvent.click(disconnectBtn);

    expect(onDisconnect).toHaveBeenCalledTimes(1);
    // After disconnect, the widget resets to the wallet picker.
    expect(screen.getByText(/connect a wallet/i)).toBeDefined();
  });

  it("fires onWalletConnected with the wallet address and chain on auto-connect (skipAutoConnect=false)", () => {
    // When skipAutoConnect is off and the SDK already has a primary wallet,
    // the auto-connect path should fire onWalletConnected so hosts that
    // derive destinationAddress from this callback receive the correct
    // address before the payment flow runs.
    const onWalletConnected = vi.fn();
    render(
      <CheckoutWidget
        {...requiredProps}
        skipAutoConnect={false}
        onWalletConnected={onWalletConnected}
      />,
    );
    // Auto-connect must fire onWalletConnected exactly once with the
    // address and chain.
    expect(onWalletConnected).toHaveBeenCalledTimes(1);
    expect(onWalletConnected).toHaveBeenCalledWith(MOCK_WALLET_ADDRESS, "EVM");
  });
});
