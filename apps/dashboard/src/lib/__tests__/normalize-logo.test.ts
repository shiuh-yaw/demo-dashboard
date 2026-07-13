/**
 * Unit tests for the brand-logo normalization util.
 *
 * No network access: `fetch` is stubbed and `node:dns/promises` is mocked
 * (public address by default); test images are synthesized with sharp.
 */

import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}));

import { put } from "@vercel/blob";
import { lookup } from "node:dns/promises";

import {
  isPrivateHost,
  isPrivateIp,
  normalizeBrandingLogos,
  normalizeLogoUrl,
} from "../normalize-logo";

const LOGO_URL = "https://cdn.example.com/images/logo.png";
const PUBLIC_ADDR = [{ address: "203.0.113.7", family: 4 }];
const BLOB_URL = "https://teststore.public.blob.vercel-storage.com/brand-logos/abc.png";

const lookupMock = vi.mocked(lookup);
const putMock = vi.mocked(put);

beforeEach(() => {
  lookupMock.mockReset();
  // Default: every hostname resolves to a public address.
  lookupMock.mockResolvedValue(PUBLIC_ADDR as never);
  putMock.mockReset();
  putMock.mockResolvedValue({ url: BLOB_URL } as never);
  // Default: no blob token — the inline data-URI fallback path.
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
});

/** A 20x20 solid mark centered on a 200x200 transparent canvas. */
async function paddedLogoPng(): Promise<Buffer> {
  const mark = await sharp({
    create: {
      width: 20,
      height: 20,
      channels: 4,
      background: { r: 20, g: 40, b: 80, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: 200,
      height: 200,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: mark, top: 90, left: 90 }])
    .png()
    .toBuffer();
}

function stubFetchWith(body: Buffer, headers?: Record<string, string>) {
  const fetchMock = vi.fn(
    async () => new Response(new Uint8Array(body), { status: 200, headers }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("normalizeLogoUrl", () => {
  it("trims padding and returns a PNG data URI", async () => {
    stubFetchWith(await paddedLogoPng());

    const result = await normalizeLogoUrl(LOGO_URL);

    expect(result).toMatch(/^data:image\/png;base64,/);
    const decoded = Buffer.from(
      result.replace("data:image/png;base64,", ""),
      "base64",
    );
    const meta = await sharp(decoded).metadata();
    // The 200x200 transparent canvas collapses to the 20x20 mark.
    expect(meta.width).toBeLessThanOrEqual(30);
    expect(meta.height).toBeLessThanOrEqual(30);
  });

  it("returns the original URL when the fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    expect(await normalizeLogoUrl(LOGO_URL)).toBe(LOGO_URL);
  });

  it("returns the original URL on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404 })),
    );
    expect(await normalizeLogoUrl(LOGO_URL)).toBe(LOGO_URL);
  });

  it("returns the original URL when content-length exceeds the cap", async () => {
    const fetchMock = stubFetchWith(await paddedLogoPng(), {
      "content-length": String(3 * 1024 * 1024),
    });
    expect(await normalizeLogoUrl(LOGO_URL)).toBe(LOGO_URL);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns the original URL when the body exceeds the cap", async () => {
    // Zero-filled (low-entropy) oversized body with no content-length.
    stubFetchWith(Buffer.alloc(2 * 1024 * 1024 + 1));
    expect(await normalizeLogoUrl(LOGO_URL)).toBe(LOGO_URL);
  });

  it("passes data: URIs through without fetching", async () => {
    const fetchMock = stubFetchWith(await paddedLogoPng());
    const dataUri = "data:image/png;base64,AAAA";
    expect(await normalizeLogoUrl(dataUri)).toBe(dataUri);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-http(s) schemes without fetching", async () => {
    const fetchMock = stubFetchWith(await paddedLogoPng());
    expect(await normalizeLogoUrl("file:///etc/hosts")).toBe(
      "file:///etc/hosts",
    );
    expect(await normalizeLogoUrl("not a url")).toBe("not a url");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects private hosts without fetching", async () => {
    const fetchMock = stubFetchWith(await paddedLogoPng());
    for (const url of [
      "http://localhost/logo.png",
      "http://127.0.0.1/logo.png",
      "https://10.1.2.3/logo.png",
      "https://192.168.0.5/logo.png",
      "https://172.16.9.9/logo.png",
      "http://[::ffff:127.0.0.1]/logo.png",
      "http://2130706433/logo.png", // WHATWG canonicalizes to 127.0.0.1
    ]) {
      expect(await normalizeLogoUrl(url)).toBe(url);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects hostnames that RESOLVE to a private address without fetching", async () => {
    const fetchMock = stubFetchWith(await paddedLogoPng());
    lookupMock.mockResolvedValue([
      { address: "203.0.113.7", family: 4 },
      { address: "10.0.0.5", family: 4 }, // one private record blocks
    ] as never);
    expect(await normalizeLogoUrl("https://rebind.example.com/logo.png")).toBe(
      "https://rebind.example.com/logo.png",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unresolvable hostnames without fetching (fail closed)", async () => {
    const fetchMock = stubFetchWith(await paddedLogoPng());
    lookupMock.mockRejectedValue(new Error("ENOTFOUND"));
    expect(await normalizeLogoUrl(LOGO_URL)).toBe(LOGO_URL);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("follows a public→public redirect and normalizes the target", async () => {
    const body = await paddedLogoPng();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://assets.example.com/logo.png" },
        }),
      )
      .mockResolvedValueOnce(new Response(new Uint8Array(body)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await normalizeLogoUrl(LOGO_URL);
    expect(result).toMatch(/^data:image\/png;base64,/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]![0])).toBe(
      "https://assets.example.com/logo.png",
    );
  });

  it("refuses to follow a redirect to a private host", async () => {
    const body = await paddedLogoPng();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "http://169.254.169.254/latest/meta-data" },
        }),
      )
      .mockResolvedValue(new Response(new Uint8Array(body)));
    vi.stubGlobal("fetch", fetchMock);

    expect(await normalizeLogoUrl(LOGO_URL)).toBe(LOGO_URL);
    // Only the first (public) hop was fetched — the private target never was.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after too many redirects", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://cdn.example.com/bounce.png" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await normalizeLogoUrl(LOGO_URL)).toBe(LOGO_URL);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it("returns the original URL when the body is not an image", async () => {
    stubFetchWith(Buffer.from("<html>not an image</html>"));
    expect(await normalizeLogoUrl(LOGO_URL)).toBe(LOGO_URL);
  });
});

describe("Vercel Blob storage", () => {
  it("uploads to a content-addressed blob path and stores the blob URL", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_TEST");
    stubFetchWith(await paddedLogoPng());

    expect(await normalizeLogoUrl(LOGO_URL)).toBe(BLOB_URL);
    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock.mock.calls[0]![0]).toMatch(
      /^brand-logos\/[0-9a-f]{32}\.png$/,
    );
    expect(putMock.mock.calls[0]![2]).toMatchObject({
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
    });
  });

  it("falls back to an inline data URI when the upload fails", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_TEST");
    putMock.mockRejectedValue(new Error("store unavailable"));
    stubFetchWith(await paddedLogoPng());

    expect(await normalizeLogoUrl(LOGO_URL)).toMatch(
      /^data:image\/png;base64,/,
    );
  });

  it("does not upload without a token (inline data URI)", async () => {
    stubFetchWith(await paddedLogoPng());
    expect(await normalizeLogoUrl(LOGO_URL)).toMatch(
      /^data:image\/png;base64,/,
    );
    expect(putMock).not.toHaveBeenCalled();
  });

  it("migrates an inline data URI to blob on the next save", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_TEST");
    const fetchMock = stubFetchWith(await paddedLogoPng());
    const inline = `data:image/png;base64,${(await paddedLogoPng()).toString("base64")}`;

    expect(await normalizeLogoUrl(inline)).toBe(BLOB_URL);
    // Decoded from the data URI directly — nothing to fetch.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("leaves an inline data URI alone when there is no token", async () => {
    const inline = `data:image/png;base64,${(await paddedLogoPng()).toString("base64")}`;
    expect(await normalizeLogoUrl(inline)).toBe(inline);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("passes existing blob URLs through without fetching or uploading", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_TEST");
    const fetchMock = stubFetchWith(await paddedLogoPng());

    expect(await normalizeLogoUrl(BLOB_URL)).toBe(BLOB_URL);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(putMock).not.toHaveBeenCalled();
  });
});

describe("isPrivateHost / isPrivateIp", () => {
  it("flags loopback/private/link-local hosts and allows public ones", () => {
    expect(isPrivateHost("localhost")).toBe(true);
    expect(isPrivateHost("169.254.1.1")).toBe(true);
    expect(isPrivateHost("::1")).toBe(true);
    expect(isPrivateHost("cdn.example.com")).toBe(false);
    expect(isPrivateHost("8.8.8.8")).toBe(false);
  });

  it("flags IPv4-mapped IPv6 forms of private addresses", () => {
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIp("::ffff:7f00:1")).toBe(true); // 127.0.0.1 in hex groups
    expect(isPrivateIp("::ffff:c0a8:1")).toBe(true); // 192.168.0.1
    expect(isPrivateIp("::ffff:8.8.8.8")).toBe(false);
  });

  it("flags CGNAT and 0/8 ranges", () => {
    expect(isPrivateIp("100.64.0.1")).toBe(true);
    expect(isPrivateIp("100.128.0.1")).toBe(false);
    expect(isPrivateIp("0.0.0.0")).toBe(true);
  });
});

describe("normalizeBrandingLogos", () => {
  it("normalizes http(s) branding.logo / branding.logoUrl keys only", async () => {
    stubFetchWith(await paddedLogoPng());

    const config = {
      tokenName: "USDC",
      branding: {
        logo: "dynamic", // enum value, not a URL — must be untouched
        logoUrl: LOGO_URL,
        companyName: "Acme",
      },
    };
    const result = await normalizeBrandingLogos(config);

    expect(result.branding.logo).toBe("dynamic");
    expect(result.branding.logoUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.branding.companyName).toBe("Acme");
    expect(result.tokenName).toBe("USDC");
    // Original input is not mutated.
    expect(config.branding.logoUrl).toBe(LOGO_URL);
  });

  it("normalizes a URL stored in branding.logo (wallet-style configs)", async () => {
    stubFetchWith(await paddedLogoPng());
    const result = await normalizeBrandingLogos({
      branding: { logo: LOGO_URL },
    });
    expect(result.branding.logo).toMatch(/^data:image\/png;base64,/);
  });

  it("returns the same reference when there is nothing to normalize", async () => {
    const fetchMock = stubFetchWith(await paddedLogoPng());
    const noBranding = { theme: "dark" };
    expect(await normalizeBrandingLogos(noBranding)).toBe(noBranding);

    const dataUriConfig = {
      branding: { logoUrl: "data:image/png;base64,AAAA" },
    };
    expect(await normalizeBrandingLogos(dataUriConfig)).toBe(dataUriConfig);

    expect(await normalizeBrandingLogos(undefined)).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
