/**
 * Exchange helper definitions tests.
 *
 * Covers:
 * - Exchange helpers have correct shape (id, sig, tag, desc, rawCode, docsUrl)
 * - HelperTag includes "Exchange"
 * - CHECKOUT_EXTRAS and DEPOSIT_EXTRAS include the 4 exchange helpers
 * - WITHDRAW_EXTRAS does NOT include exchange helpers
 * - Exchange helper code snippets reference canonical SDK imports
 * - Exchange helper docsUrl values point to Dynamic docs
 */

import { describe, expect, it } from "vitest";

import {
  CHECKOUT_EXTRAS,
  DEPOSIT_EXTRAS,
  WITHDRAW_EXTRAS,
  type HelperTag,
} from "@/lib/flow-helpers";

const EXCHANGE_HELPER_IDS = [
  "exchange-oauth",
  "getKrakenAccounts",
  "getKrakenWhitelistedAddresses",
  "createKrakenExchangeTransfer",
] as const;

describe("Exchange helper definitions", () => {
  const checkoutHelpers = CHECKOUT_EXTRAS.helpers;
  const depositHelpers = DEPOSIT_EXTRAS.helpers;
  const withdrawHelpers = WITHDRAW_EXTRAS.helpers;

  it("CHECKOUT_EXTRAS includes all 4 exchange helpers", () => {
    const ids = checkoutHelpers.map((h) => h.id);
    for (const id of EXCHANGE_HELPER_IDS) {
      expect(ids).toContain(id);
    }
  });

  it("DEPOSIT_EXTRAS includes all 4 exchange helpers", () => {
    const ids = depositHelpers.map((h) => h.id);
    for (const id of EXCHANGE_HELPER_IDS) {
      expect(ids).toContain(id);
    }
  });

  it("WITHDRAW_EXTRAS does NOT include exchange helpers", () => {
    const ids = withdrawHelpers.map((h) => h.id);
    for (const id of EXCHANGE_HELPER_IDS) {
      expect(ids).not.toContain(id);
    }
  });

  it("all exchange helpers are tagged 'Exchange'", () => {
    const exchangeHelpers = checkoutHelpers.filter((h) =>
      (EXCHANGE_HELPER_IDS as readonly string[]).includes(h.id),
    );
    expect(exchangeHelpers).toHaveLength(4);
    for (const h of exchangeHelpers) {
      expect(h.tag).toBe("Exchange" satisfies HelperTag);
    }
  });

  it("each exchange helper has a non-empty sig tuple", () => {
    const exchangeHelpers = checkoutHelpers.filter((h) =>
      (EXCHANGE_HELPER_IDS as readonly string[]).includes(h.id),
    );
    for (const h of exchangeHelpers) {
      expect(h.sig).toHaveLength(2);
      expect(h.sig[0].length).toBeGreaterThan(0);
      expect(h.sig[1].length).toBeGreaterThan(0);
    }
  });

  it("each exchange helper has a docsUrl pointing to dynamic.xyz", () => {
    const exchangeHelpers = checkoutHelpers.filter((h) =>
      (EXCHANGE_HELPER_IDS as readonly string[]).includes(h.id),
    );
    for (const h of exchangeHelpers) {
      expect(h.docsUrl).toBeDefined();
      expect(h.docsUrl).toMatch(/^https:\/\/www\.dynamic\.xyz\/docs\//);
    }
  });

  it("exchange OAuth helper references signInWithSocialRedirect", () => {
    const oauth = checkoutHelpers.find((h) => h.id === "exchange-oauth");
    expect(oauth).toBeDefined();
    expect(oauth!.rawCode).toContain("signInWithSocialRedirect");
    expect(oauth!.rawCode).toContain("detectSocialRedirectUrl");
    expect(oauth!.rawCode).toContain("completeSocialRedirect");
    expect(oauth!.rawCode).toContain('"kraken"');
  });

  it("getKrakenAccounts helper references the SDK import", () => {
    const helper = checkoutHelpers.find((h) => h.id === "getKrakenAccounts");
    expect(helper).toBeDefined();
    expect(helper!.rawCode).toContain(
      'import { getKrakenAccounts } from "@dynamic-labs-sdk/client"',
    );
  });

  it("getKrakenWhitelistedAddresses helper references the SDK import", () => {
    const helper = checkoutHelpers.find(
      (h) => h.id === "getKrakenWhitelistedAddresses",
    );
    expect(helper).toBeDefined();
    expect(helper!.rawCode).toContain(
      'import { getKrakenWhitelistedAddresses } from "@dynamic-labs-sdk/client"',
    );
    expect(helper!.rawCode).toContain("enforcesAddressWhitelist");
  });

  it("createKrakenExchangeTransfer helper references the SDK import", () => {
    const helper = checkoutHelpers.find(
      (h) => h.id === "createKrakenExchangeTransfer",
    );
    expect(helper).toBeDefined();
    expect(helper!.rawCode).toContain("createKrakenExchangeTransfer");
    expect(helper!.rawCode).toContain("accountId");
    expect(helper!.rawCode).toContain("currency");
  });

  it("checkout and deposit share the same exchange helper instances", () => {
    for (const id of EXCHANGE_HELPER_IDS) {
      const fromCheckout = checkoutHelpers.find((h) => h.id === id);
      const fromDeposit = depositHelpers.find((h) => h.id === id);
      expect(fromCheckout).toBe(fromDeposit);
    }
  });
});
