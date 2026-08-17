import { describe, expect, it } from "vitest";
import {
  iconArea,
  logoCandidatesFromHtml,
  resolveUrl,
} from "../brand-sources";

describe("logoCandidatesFromHtml", () => {
  it("prefers the masthead wordmark over app icons", () => {
    const html = `
      <head><link rel="apple-touch-icon" href="/icon-180.png"></head>
      <header><img src="/assets/acme-wordmark.svg" class="site-logo"></header>
      <main></main>`;

    expect(logoCandidatesFromHtml(html)).toEqual([
      "/assets/acme-wordmark.svg",
      "/icon-180.png",
    ]);
  });

  it("ignores a customer logo wall below the masthead", () => {
    // chainalysis.com yielded Coinbase's mark this way: a page-wide "src
    // contains logo" scan matched a "trusted by" strip.
    const html = `
      <header><img src="/brand/acme.svg" alt="Acme"></header>
      <section class="customers">
        <img src="/logos/logo-coinbase-1.svg" alt="Coinbase">
      </section>`;

    expect(logoCandidatesFromHtml(html)).not.toContain(
      "/logos/logo-coinbase-1.svg",
    );
  });

  it("keeps an inverted variant but ranks it last", () => {
    const html = `
      <header>
        <img src="/logo-white.svg" class="logo">
        <link rel="apple-touch-icon" href="/touch-icon.png">
      </header>`;
    const candidates = logoCandidatesFromHtml(html);

    // Still a correct logo, so it survives - just behind anything that is
    // visible on a light surface.
    expect(candidates).toContain("/logo-white.svg");
    expect(candidates.indexOf("/logo-white.svg")).toBe(candidates.length - 1);
  });

  it("never offers a favicon", () => {
    const html = `<header><img src="/favicon-logo.ico" class="logo"></header>`;
    expect(logoCandidatesFromHtml(html)).toEqual([]);
  });

  it("returns nothing for markup that never arrived", () => {
    expect(logoCandidatesFromHtml("")).toEqual([]);
  });

  it("reads a declared og:logo", () => {
    const html = `<meta property="og:logo" content="https://cdn.acme.com/mark.png">`;
    expect(logoCandidatesFromHtml(html)[0]).toBe(
      "https://cdn.acme.com/mark.png",
    );
  });
});

describe("iconArea", () => {
  it("takes the largest declared dimension", () => {
    expect(iconArea("48x48 512x512 256x256")).toBe(512);
  });

  it("treats a missing or unparseable size as zero", () => {
    expect(iconArea(undefined)).toBe(0);
    expect(iconArea("any")).toBe(0);
  });
});

describe("resolveUrl", () => {
  it("leaves absolute URLs alone and fixes protocol-relative ones", () => {
    expect(resolveUrl("https://cdn.acme.com/a.png", "https://acme.com")).toBe(
      "https://cdn.acme.com/a.png",
    );
    expect(resolveUrl("//cdn.acme.com/a.png", "https://acme.com")).toBe(
      "https://cdn.acme.com/a.png",
    );
  });

  it("resolves root-relative and bare paths against the origin", () => {
    expect(resolveUrl("/a.png", "https://acme.com")).toBe(
      "https://acme.com/a.png",
    );
    expect(resolveUrl("a.png", "https://acme.com")).toBe(
      "https://acme.com/a.png",
    );
  });
});
