// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Stable mock handles referenced inside the hoisted vi.mock factories
// (mirrors the pattern in use-wallet-connect-catalog.test.tsx).
const getWalletConnectCatalogMock = vi.fn();
const connectWithWalletConnectEvmMock = vi.fn();

vi.mock("@dynamic-labs-sdk/client", async () => {
  const actual = await vi.importActual<
    typeof import("@dynamic-labs-sdk/client")
  >("@dynamic-labs-sdk/client");
  return {
    ...actual,
    // No browser-extension wallets → the picker opens directly on the
    // WalletConnect ("discovered") catalog view.
    getAvailableWalletProvidersData: vi.fn(() => []),
    // No pre-connected wallet — the WC wallet is the first to connect.
    getPrimaryWalletAccount: vi.fn(() => null),
    onEvent: vi.fn(),
    offEvent: vi.fn(),
    getWalletConnectCatalog: (...args: unknown[]) =>
      getWalletConnectCatalogMock(...args),
  };
});

vi.mock("@dynamic-labs-sdk/evm/wallet-connect", () => ({
  connectWithWalletConnectEvm: (...args: unknown[]) =>
    connectWithWalletConnectEvmMock(...args),
  connectAndVerifyWithWalletConnectEvm: vi.fn(),
}));

vi.mock("@dynamic-labs-sdk/solana/wallet-connect", () => ({
  connectWithWalletConnectSolana: vi.fn(),
  connectAndVerifyWithWalletConnectSolana: vi.fn(),
}));

import WalletPickerScreen from "@/components/wallet-picker-screen";

/** Minimal one-EVM-wallet catalog so the discovered list has a row. */
function fakeCatalog() {
  return {
    groups: {},
    wallets: {
      "wc-alpha": {
        name: "Alpha Wallet",
        chain: "EVM" as const,
        spriteUrl: "alpha.png",
        deeplinks: {},
        downloadLinks: {},
      },
    },
  };
}

describe("WalletPickerScreen — WalletConnect connect", () => {
  it("awaits approval() and reports the connected wallet to onConnected", async () => {
    // The SDK's WalletConnect connect returns { uri, approval }: the uri
    // is shown as a QR immediately, and approval() resolves AFTER the
    // buyer scans + approves, yielding the freshly-created wallet
    // accounts. The widget must await approval() to finalize the
    // handshake — without it, the scan completes but nothing advances.
    const account = { address: "0xWALLETCONNECT", chain: "EVM" } as never;
    const approval = vi
      .fn()
      .mockResolvedValue({ walletAccounts: [account] });
    connectWithWalletConnectEvmMock.mockResolvedValue({
      uri: "wc:deadbeef@2?relay-protocol=irn&symKey=abc",
      approval,
    });
    getWalletConnectCatalogMock.mockResolvedValue(fakeCatalog());

    const onConnected = vi.fn();

    render(
      <WalletPickerScreen onConnected={onConnected} verifyOnConnect={false} />,
    );

    // The catalog row appears once the (mocked) fetch resolves.
    const label = await screen.findByText("Alpha Wallet");
    fireEvent.click(label.closest("button")!);

    // SDK is invoked and hands back { uri, approval }.
    await waitFor(() =>
      expect(connectWithWalletConnectEvmMock).toHaveBeenCalledTimes(1),
    );

    // The missing piece: the widget must await approval() to drive the
    // session to completion (this is what creates the Dynamic wallet
    // account + emits walletAccountsChanged in the SDK).
    await waitFor(() => expect(approval).toHaveBeenCalledTimes(1));

    // …and report the resulting account so the host flow advances.
    await waitFor(() => expect(onConnected).toHaveBeenCalledWith(account));
  });

  it("does not report a connection if the buyer backs out before approving", async () => {
    // A handshake the buyer abandons (taps "Back to wallets" before
    // approving in their wallet) must NOT later yank them forward when
    // the orphaned approval() eventually resolves.
    const account = { address: "0xWALLETCONNECT", chain: "EVM" } as never;
    let resolveApproval!: (value: { walletAccounts: unknown[] }) => void;
    const approval = vi.fn(
      () =>
        new Promise<{ walletAccounts: unknown[] }>((resolve) => {
          resolveApproval = resolve;
        }),
    );
    connectWithWalletConnectEvmMock.mockResolvedValue({
      uri: "wc:deadbeef@2?relay-protocol=irn&symKey=abc",
      approval,
    });
    getWalletConnectCatalogMock.mockResolvedValue(fakeCatalog());

    const onConnected = vi.fn();

    render(
      <WalletPickerScreen onConnected={onConnected} verifyOnConnect={false} />,
    );

    const label = await screen.findByText("Alpha Wallet");
    fireEvent.click(label.closest("button")!);

    // QR is up; approval() is pending (buyer hasn't scanned yet).
    const back = await screen.findByText(/back to wallets/i);
    await waitFor(() => expect(approval).toHaveBeenCalledTimes(1));

    // Buyer backs out before approving.
    fireEvent.click(back.closest("button")!);

    // The orphaned handshake resolves afterwards.
    await act(async () => {
      resolveApproval({ walletAccounts: [account] });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onConnected).not.toHaveBeenCalled();
  });
});
