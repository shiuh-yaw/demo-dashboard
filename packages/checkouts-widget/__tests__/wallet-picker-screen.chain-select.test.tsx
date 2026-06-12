// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const connectAndVerifyWithWalletProviderMock = vi.fn();

vi.mock("@dynamic-labs-sdk/client", async () => {
  const actual = await vi.importActual<
    typeof import("@dynamic-labs-sdk/client")
  >("@dynamic-labs-sdk/client");
  return {
    ...actual,
    getAvailableWalletProvidersData: vi.fn(() => [
      {
        key: "phantomevm",
        name: "Phantom",
        chain: "EVM",
        groupKey: "phantom",
        walletProviderType: "browserExtension",
        iconUrl: "https://example.com/phantom.png",
        metadata: { displayName: "Phantom", icon: "https://example.com/phantom.png" },
      },
      {
        key: "phantomsol",
        name: "Phantom",
        chain: "SOL",
        groupKey: "phantom",
        walletProviderType: "browserExtension",
        iconUrl: "https://example.com/phantom.png",
        metadata: { displayName: "Phantom", icon: "https://example.com/phantom.png" },
      },
      {
        key: "metamaskevm",
        name: "MetaMask",
        chain: "EVM",
        groupKey: "metamask",
        walletProviderType: "browserExtension",
        iconUrl: "https://example.com/metamask.png",
        metadata: { displayName: "MetaMask", icon: "https://example.com/metamask.png" },
      },
    ]),
    getPrimaryWalletAccount: vi.fn(() => null),
    getWalletAccounts: vi.fn(() => []),
    onEvent: vi.fn(),
    offEvent: vi.fn(),
    connectAndVerifyWithWalletProvider: (...args: unknown[]) =>
      connectAndVerifyWithWalletProviderMock(...args),
    connectWithWalletProvider: vi.fn(),
    getWalletConnectCatalog: vi.fn(() => Promise.resolve({ groups: {}, wallets: {} })),
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

import WalletPickerScreen from "@/components/wallet-picker-screen";
import type { WalletGroup } from "@/lib/wallet-providers";

describe("WalletPickerScreen — chain selection for multi-chain wallets", () => {
  it("shows chain selection when clicking a multi-chain wallet", () => {
    let chainSelectState: WalletGroup | null = null;
    const onChainSelectChange = vi.fn((wallet: WalletGroup | null) => {
      chainSelectState = wallet;
    });

    const { rerender } = render(
      <WalletPickerScreen
        onConnected={vi.fn()}
        onChainSelectChange={onChainSelectChange}
        selectedWalletForChain={null}
      />,
    );

    // Phantom has both EVM + SOL providers — clicking it should
    // trigger onChainSelectChange instead of connecting directly.
    const phantomRow = screen.getByText("Phantom");
    fireEvent.click(phantomRow.closest("button")!);

    expect(onChainSelectChange).toHaveBeenCalledOnce();
    expect(onChainSelectChange).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "Phantom" }),
    );

    // Re-render with chain selection active to see the sub-view
    rerender(
      <WalletPickerScreen
        onConnected={vi.fn()}
        onChainSelectChange={onChainSelectChange}
        selectedWalletForChain={chainSelectState}
      />,
    );

    // Should show chain options (EVM + Solana)
    expect(screen.getByText("EVM")).toBeDefined();
    expect(screen.getByText("Solana")).toBeDefined();
    expect(screen.getByText(/supports multiple chains/i)).toBeDefined();
  });

  it("connects directly when clicking a single-chain wallet (no chain selection)", () => {
    const onConnected = vi.fn();
    const onChainSelectChange = vi.fn();

    connectAndVerifyWithWalletProviderMock.mockResolvedValue({
      address: "0xABC",
      chain: "EVM",
    });

    render(
      <WalletPickerScreen
        onConnected={onConnected}
        onChainSelectChange={onChainSelectChange}
        selectedWalletForChain={null}
      />,
    );

    // MetaMask has only EVM — should connect directly without chain selection
    const metamaskRow = screen.getByText("MetaMask");
    fireEvent.click(metamaskRow.closest("button")!);

    // Should NOT trigger chain selection
    expect(onChainSelectChange).not.toHaveBeenCalled();
    // Should attempt to connect directly
    expect(connectAndVerifyWithWalletProviderMock).toHaveBeenCalledOnce();
  });

  it("connects with specific chain provider when chain is selected", async () => {
    const onConnected = vi.fn();
    const phantomGroup: WalletGroup = {
      key: "phantom",
      displayName: "Phantom",
      icon: "https://example.com/phantom.png",
      providers: [
        { key: "phantomevm", chain: "EVM", walletProviderType: "browserExtension" } as never,
        { key: "phantomsol", chain: "SOL", walletProviderType: "browserExtension" } as never,
      ],
    };

    connectAndVerifyWithWalletProviderMock.mockResolvedValue({
      address: "SOLaddr123",
      chain: "SOL",
    });

    render(
      <WalletPickerScreen
        onConnected={onConnected}
        onChainSelectChange={vi.fn()}
        selectedWalletForChain={phantomGroup}
      />,
    );

    // Chain selection is showing — click Solana
    const solanaBtn = screen.getByText("Solana");
    fireEvent.click(solanaBtn.closest("button")!);

    expect(connectAndVerifyWithWalletProviderMock).toHaveBeenCalledWith({
      walletProviderKey: "phantomsol",
    });
  });

  it("renders info box with wallet name in chain selection view", () => {
    const phantomGroup: WalletGroup = {
      key: "phantom",
      displayName: "Phantom",
      icon: "https://example.com/phantom.png",
      providers: [
        { key: "phantomevm", chain: "EVM", walletProviderType: "browserExtension" } as never,
        { key: "phantomsol", chain: "SOL", walletProviderType: "browserExtension" } as never,
      ],
    };

    render(
      <WalletPickerScreen
        onConnected={vi.fn()}
        onChainSelectChange={vi.fn()}
        selectedWalletForChain={phantomGroup}
      />,
    );

    expect(
      screen.getByText(/Phantom supports multiple chains/i),
    ).toBeDefined();
  });
});
