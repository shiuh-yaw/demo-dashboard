/**
 * Pure redirect helpers.
 *
 * `redirect_uri` is caller-supplied and flows into `window.location.assign`, so
 * the scheme decision in `isRedirectAllowed` is the security-critical logic in
 * this app. It is not exported, so it is exercised through `getRedirectBase`.
 *
 * `./config` is mocked rather than imported: it pulls in `resolveCredentials`
 * and zod-validated env, none of which this logic depends on, and mocking is
 * the only way to exercise strict allow-list mode.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const DEFAULT_CALLBACK_PATH = "/callback";
const BLOCKED_REDIRECT_SCHEMES = [
  "javascript",
  "data",
  "vbscript",
  "file",
  "blob",
  "about",
];

const cfg = {
  ALLOWED_REDIRECT_SCHEMES: null as string[] | null,
  BLOCKED_REDIRECT_SCHEMES,
  DEFAULT_CALLBACK_PATH,
  REDIRECT_BASE_URL: undefined as string | undefined,
};

vi.mock("../config", () => ({
  get ALLOWED_REDIRECT_SCHEMES() {
    return cfg.ALLOWED_REDIRECT_SCHEMES;
  },
  get BLOCKED_REDIRECT_SCHEMES() {
    return cfg.BLOCKED_REDIRECT_SCHEMES;
  },
  get DEFAULT_CALLBACK_PATH() {
    return cfg.DEFAULT_CALLBACK_PATH;
  },
  get REDIRECT_BASE_URL() {
    return cfg.REDIRECT_BASE_URL;
  },
}));

const {
  buildRedirectUrl,
  chainMeta,
  detectAddressChain,
  getIncomingNonce,
  getRedirectBase,
  getRedirectScheme,
  isTronAddress,
  normalizeChain,
} = await import("../redirect");

const ORIGIN = "https://connections.example";

/** Minimal `window` stand-in - these helpers only read location. */
function setLocation(search: string, pathname = "/") {
  (globalThis as { window?: unknown }).window = {
    location: {
      search,
      origin: ORIGIN,
      pathname,
      href: `${ORIGIN}${pathname}${search}`,
      assign: vi.fn(),
    },
  };
}

const WALLET = {
  address: "0x1111111111111111111111111111111111111111",
  chain: "evm" as const,
  walletName: "MetaMask",
  walletImage: "https://cdn.example/mm.png",
};

beforeEach(() => {
  cfg.ALLOWED_REDIRECT_SCHEMES = null;
  cfg.REDIRECT_BASE_URL = undefined;
  setLocation("");
});

describe("getRedirectBase - scheme safety", () => {
  const DEFAULT = `${ORIGIN}${DEFAULT_CALLBACK_PATH}`;

  it.each(["javascript", "data", "vbscript", "file", "blob", "about"])(
    "rejects the %s scheme and falls back to the default callback",
    (scheme) => {
      setLocation(`?redirect_uri=${encodeURIComponent(`${scheme}:alert(1)`)}`);
      expect(getRedirectBase()).toBe(DEFAULT);
    },
  );

  it("rejects the javascript://host authority-form trick", () => {
    setLocation(
      `?redirect_uri=${encodeURIComponent("javascript://x/%0aalert(1)")}`,
    );
    expect(getRedirectBase()).toBe(DEFAULT);
  });

  it("rejects an opaque custom scheme that carries no host", () => {
    // Not on the block-list, but non-hierarchical - rejected structurally
    // rather than by block-list completeness.
    setLocation(`?redirect_uri=${encodeURIComponent("mailto:a@b.com")}`);
    expect(getRedirectBase()).toBe(DEFAULT);
  });

  it("accepts https and http", () => {
    setLocation(`?redirect_uri=${encodeURIComponent("https://ok.example/cb")}`);
    expect(getRedirectBase()).toBe("https://ok.example/cb");
    setLocation(`?redirect_uri=${encodeURIComponent("http://ok.example/cb")}`);
    expect(getRedirectBase()).toBe("http://ok.example/cb");
  });

  it("accepts a hierarchical custom app scheme for native hosts", () => {
    setLocation(
      `?redirect_uri=${encodeURIComponent("fbconnectdemo://wallet-callback")}`,
    );
    expect(getRedirectBase()).toBe("fbconnectdemo://wallet-callback");
  });

  it("accepts the redirect_url alias", () => {
    setLocation(`?redirect_url=${encodeURIComponent("https://ok.example/cb")}`);
    expect(getRedirectBase()).toBe("https://ok.example/cb");
  });

  it("falls back when the candidate is unparseable", () => {
    setLocation("?redirect_uri=not-a-url");
    expect(getRedirectBase()).toBe(DEFAULT);
  });

  it("prefers the configured default over same-origin /callback", () => {
    cfg.REDIRECT_BASE_URL = "https://configured.example/done";
    setLocation("");
    expect(getRedirectBase()).toBe("https://configured.example/done");
  });
});

describe("getRedirectBase - strict allow-list mode", () => {
  it("is authoritative: rejects https when not listed", () => {
    cfg.ALLOWED_REDIRECT_SCHEMES = ["fbconnectdemo"];
    setLocation(`?redirect_uri=${encodeURIComponent("https://ok.example/cb")}`);
    expect(getRedirectBase()).toBe(`${ORIGIN}${DEFAULT_CALLBACK_PATH}`);
  });

  it("accepts a listed scheme", () => {
    cfg.ALLOWED_REDIRECT_SCHEMES = ["fbconnectdemo"];
    setLocation(
      `?redirect_uri=${encodeURIComponent("fbconnectdemo://wallet-callback")}`,
    );
    expect(getRedirectBase()).toBe("fbconnectdemo://wallet-callback");
  });

  it("cannot widen back to a blocked scheme by listing one", () => {
    // The block-list wins over the allow-list, so a misconfigured deployment
    // that names a script scheme still cannot navigate to it.
    cfg.ALLOWED_REDIRECT_SCHEMES = ["javascript"];
    setLocation(`?redirect_uri=${encodeURIComponent("javascript://x/")}`);
    expect(getRedirectBase()).toBe(`${ORIGIN}${DEFAULT_CALLBACK_PATH}`);
  });
});

describe("getRedirectScheme", () => {
  it("reports the resolved target's scheme", () => {
    setLocation(
      `?redirect_uri=${encodeURIComponent("fbconnectdemo://wallet-callback")}`,
    );
    expect(getRedirectScheme()).toBe("fbconnectdemo");
  });

  it("reports https for the same-origin default", () => {
    setLocation("");
    expect(getRedirectScheme()).toBe("https");
  });
});

describe("getIncomingNonce", () => {
  it("returns the nonce when present, null otherwise", () => {
    setLocation("?nonce=abc123");
    expect(getIncomingNonce()).toBe("abc123");
    setLocation("");
    expect(getIncomingNonce()).toBeNull();
  });
});

describe("normalizeChain", () => {
  it.each(["SOL", "SOLANA", "SVM", "sol", "solana"])(
    "maps %s to solana",
    (input) => {
      expect(normalizeChain(input)).toBe("solana");
    },
  );

  it.each(["EVM", "ETH", "", "anything", null, undefined])(
    "defaults %s to evm",
    (input) => {
      expect(normalizeChain(input)).toBe("evm");
    },
  );
});

describe("isTronAddress", () => {
  it("matches a 34-char Base58Check address starting with T", () => {
    expect(isTronAddress("TQ8k8dQ5nBvKzXcRfKvRQ8k8dQ5nBvKzXc")).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    expect(isTronAddress("  TQ8k8dQ5nBvKzXcRfKvRQ8k8dQ5nBvKzXc  ")).toBe(true);
  });

  it("rejects the wrong length or a non-T prefix", () => {
    expect(isTronAddress("TQ8k8dQ5nBvKzXc")).toBe(false);
    expect(isTronAddress("AQ8k8dQ5nBvKzXcRfKvRQ8k8dQ5nBvKzXc")).toBe(false);
  });
});

describe("detectAddressChain", () => {
  it("detects an EVM address, case-insensitively", () => {
    expect(detectAddressChain(WALLET.address)).toBe("evm");
    expect(detectAddressChain("0xAbCdEf0123456789AbCdEf0123456789AbCdEf01")).toBe(
      "evm",
    );
  });

  it("detects a Solana address", () => {
    expect(
      detectAddressChain("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"),
    ).toBe("solana");
  });

  it("returns null for Tron, which overlaps Solana's base58 charset", () => {
    // The ordering in detectAddressChain matters: a 34-char Tron address would
    // otherwise fall into the 32-44 base58 Solana range.
    expect(detectAddressChain("TQ8k8dQ5nBvKzXcRfKvRQ8k8dQ5nBvKzXc")).toBeNull();
  });

  it("returns null for a short hex string or junk", () => {
    expect(detectAddressChain("0x1234")).toBeNull();
    expect(detectAddressChain("not an address")).toBeNull();
    expect(detectAddressChain("")).toBeNull();
  });

  it("ignores surrounding whitespace", () => {
    expect(detectAddressChain(`  ${WALLET.address}  `)).toBe("evm");
  });
});

describe("chainMeta", () => {
  it("labels solana and evm distinctly", () => {
    expect(chainMeta("SOL").title).toBe("Solana");
    expect(chainMeta("EVM").title).toBe("Ethereum & EVM");
  });
});

describe("buildRedirectUrl", () => {
  it("carries the documented outgoing contract", () => {
    setLocation(`?redirect_uri=${encodeURIComponent("https://ok.example/cb")}`);
    const url = new URL(buildRedirectUrl(WALLET, "n-1"));

    expect(url.origin + url.pathname).toBe("https://ok.example/cb");
    expect(url.searchParams.get("address")).toBe(WALLET.address);
    expect(url.searchParams.get("chain")).toBe("evm");
    expect(url.searchParams.get("walletName")).toBe("MetaMask");
    expect(url.searchParams.get("walletImage")).toBe(WALLET.walletImage);
    expect(url.searchParams.get("nonce")).toBe("n-1");
  });

  it("omits the nonce when none was received", () => {
    setLocation(`?redirect_uri=${encodeURIComponent("https://ok.example/cb")}`);
    const url = new URL(buildRedirectUrl(WALLET, null));
    expect(url.searchParams.has("nonce")).toBe(false);
  });

  it("adds `from` only for our own callback page", () => {
    setLocation("", "/connect");
    const own = new URL(buildRedirectUrl(WALLET, null));
    expect(own.searchParams.get("from")).toBe("/connect");

    setLocation(
      `?redirect_uri=${encodeURIComponent("https://ok.example/cb")}`,
      "/connect",
    );
    const external = new URL(buildRedirectUrl(WALLET, null));
    expect(external.searchParams.has("from")).toBe(false);
  });
});
