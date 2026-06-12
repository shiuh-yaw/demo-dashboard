// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

afterEach(() => cleanup());

const MOCK_WALLET_ADDRESS = "0xD3adB33fCaf3B4d07E5C7B2e123F8a0C9eA5bD12";

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
    getWalletAccounts: vi.fn(() => [
      {
        address: MOCK_WALLET_ADDRESS,
        chain: "EVM",
        id: "wallet-1",
        key: "metamask",
        name: "MetaMask",
      },
    ]),
    getAvailableWalletProvidersData: vi.fn(() => []),
    getBalances: vi.fn(() => Promise.resolve([])),
    getNetworksData: vi.fn(() => [
      { chain: "EVM", networkId: 1 },
      { chain: "EVM", networkId: 8453 },
      { chain: "SOL", networkId: 101 },
    ]),
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

describe("CheckoutWidget — asset selector (no chain tabs)", () => {
  it("does not render chain tabs in the asset selector", async () => {
    render(<CheckoutWidget {...requiredProps} />);
    // Wait for the asset selector to render (wallet auto-connects via mock)
    await waitFor(() => {
      // The asset selector shows the empty state since getBalances returns []
      expect(screen.getByText(/No spendable tokens/i)).toBeDefined();
    });
    // Verify NO chain tab buttons exist
    expect(screen.queryByRole("button", { name: "All" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^EVM/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Solana/ })).toBeNull();
  });

  it("shows empty state when getBalances returns no tokens", async () => {
    render(<CheckoutWidget {...requiredProps} />);
    await waitFor(() => {
      expect(screen.getByText(/No spendable tokens/i)).toBeDefined();
    });
    expect(screen.getByText(/Switch wallets or top up/i)).toBeDefined();
  });
});
