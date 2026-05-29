// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Reset the module-level cache between tests so each test starts
  // from a cold fetch. Without this the second test's renderHook
  // pulls from the first test's cached resolved value and skips the
  // mocked call entirely, breaking the call-count assertions.
  vi.resetModules();
});

const getWalletConnectCatalogMock = vi.fn();

vi.mock("@dynamic-labs-sdk/client", () => ({
  getWalletConnectCatalog: (...args: unknown[]) =>
    getWalletConnectCatalogMock(...args),
}));

function fakeCatalog() {
  return {
    groups: {
      "phantom-group": {
        key: "phantom-group",
        name: "Phantom",
        spriteUrl: "phantom.png",
      },
    },
    wallets: {
      "wc-alpha": {
        name: "Alpha Wallet",
        chain: "EVM" as const,
        spriteUrl: "alpha.png",
        deeplinks: {},
        downloadLinks: {},
      },
      "wc-phantom-evm": {
        name: "Phantom",
        chain: "EVM" as const,
        spriteUrl: "phantom.png",
        deeplinks: {},
        downloadLinks: {},
        groupId: "phantom-group",
      },
      "wc-phantom-sol": {
        name: "Phantom",
        chain: "SOL" as const,
        spriteUrl: "phantom.png",
        deeplinks: {},
        downloadLinks: {},
        groupId: "phantom-group",
      },
    },
  };
}

describe("useWalletConnectCatalog", () => {
  beforeEach(async () => {
    // Re-import the hook so it picks up the freshly-reset module cache.
    await import("@/hooks/use-wallet-connect-catalog");
  });

  it("does not fetch when disabled", async () => {
    getWalletConnectCatalogMock.mockResolvedValueOnce(fakeCatalog());
    const { useWalletConnectCatalog } = await import(
      "@/hooks/use-wallet-connect-catalog"
    );

    const { result } = renderHook(() =>
      useWalletConnectCatalog({ enabled: false }),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.catalog).toBeNull();
    expect(getWalletConnectCatalogMock).not.toHaveBeenCalled();
  });

  it("returns the raw catalog payload", async () => {
    getWalletConnectCatalogMock.mockResolvedValueOnce(fakeCatalog());
    const { useWalletConnectCatalog } = await import(
      "@/hooks/use-wallet-connect-catalog"
    );

    const { result } = renderHook(() =>
      useWalletConnectCatalog({ enabled: true }),
    );

    await waitFor(() => {
      expect(result.current.catalog).not.toBeNull();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(Object.keys(result.current.catalog!.wallets)).toEqual([
      "wc-alpha",
      "wc-phantom-evm",
      "wc-phantom-sol",
    ]);
  });

  it("settles cleanly under React Strict Mode", async () => {
    getWalletConnectCatalogMock.mockResolvedValue(fakeCatalog());
    const { useWalletConnectCatalog } = await import(
      "@/hooks/use-wallet-connect-catalog"
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );

    const { result } = renderHook(
      () => useWalletConnectCatalog({ enabled: true }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.catalog).not.toBeNull();
    });

    expect(result.current.loading).toBe(false);
    // Module cache dedupes — only one SDK call regardless of how many
    // times Strict Mode mounted us.
    expect(getWalletConnectCatalogMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces fetch errors via `error`", async () => {
    getWalletConnectCatalogMock.mockRejectedValueOnce(
      new Error("network down"),
    );
    const { useWalletConnectCatalog } = await import(
      "@/hooks/use-wallet-connect-catalog"
    );

    const { result } = renderHook(() =>
      useWalletConnectCatalog({ enabled: true }),
    );

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toBe("network down");
    expect(result.current.loading).toBe(false);
  });
});
