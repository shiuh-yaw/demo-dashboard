import { describe, expect, it } from "vitest";
import { assertAuthoredCodeSteps } from "@dynamic-demos/code-highlight/testing";
import {
  ACCOUNTS_ACCOUNT_STEPS,
  ACCOUNTS_ADD_WALLET_STEPS,
  ACCOUNTS_MEMBER_STEPS,
  ACCOUNTS_RENAME_STEPS,
  ACCOUNTS_SDK_STEPS,
  ACCOUNTS_SEND_STEPS,
  ACCOUNTS_SIGNER_STEPS,
  ACCOUNTS_SIGNING_STEPS,
  ACCOUNTS_TRANSACTION_STEPS,
  ACCOUNTS_WALLET_STEPS,
  buildCodeSteps,
} from "../lib/code-steps";

/** Every panel section, keyed by its `PanelSection` id. */
const SECTIONS = {
  default: ACCOUNTS_SDK_STEPS,
  accounts: ACCOUNTS_ACCOUNT_STEPS,
  rename: ACCOUNTS_RENAME_STEPS,
  wallets: ACCOUNTS_WALLET_STEPS,
  "add-wallet": ACCOUNTS_ADD_WALLET_STEPS,
  transactions: ACCOUNTS_TRANSACTION_STEPS,
  send: ACCOUNTS_SEND_STEPS,
  signing: ACCOUNTS_SIGNING_STEPS,
  signers: ACCOUNTS_SIGNER_STEPS,
  members: ACCOUNTS_MEMBER_STEPS,
};

const ALL_STEPS = Object.values(SECTIONS).flat();

describe("accounts code-step content", () => {
  it("every panel section carries content", () => {
    // One section per screen, so sections are small by design - the assertion
    // is that none is empty, not that any is long.
    for (const [section, steps] of Object.entries(SECTIONS)) {
      expect(steps.length, section).toBeGreaterThan(0);
    }
    expect(ACCOUNTS_SDK_STEPS.length).toBeGreaterThanOrEqual(3);
  });

  it("numbers each section from 01", () => {
    for (const [section, steps] of Object.entries(SECTIONS)) {
      expect(
        steps.map((step) => step.num),
        section,
      ).toEqual(steps.map((_, index) => String(index + 1).padStart(2, "0")));
    }
  });

  it("keeps every step on the screen that makes the call", () => {
    // The panel is read beside a screen: a step for a call that screen does
    // not make is noise.
    expect(ACCOUNTS_SIGNING_STEPS.map((step) => step.title)).toEqual([
      "Sign a message",
    ]);
    expect(ACCOUNTS_RENAME_STEPS.map((step) => step.title)).toEqual([
      "Rename an account",
    ]);
    expect(ACCOUNTS_WALLET_STEPS).toHaveLength(1);
    expect(ACCOUNTS_WALLET_STEPS[0]!.code).toContain("getBusinessAccount");
    // Detach has no control (`WALLET_DETACH_ENABLED` is false), so it has no
    // step anywhere.
    for (const step of ALL_STEPS) {
      expect(step.code, step.title).not.toContain(
        "removeBusinessAccountWallet",
      );
    }
  });

  it("meets the shared authored-content rules", () => {
    // The shared helper requires a docsUrl, so it runs over the steps that
    // link a published page. Business-Accounts steps carry no link yet - those
    // docs are unpublished - so their content rules are asserted below.
    assertAuthoredCodeSteps(
      ALL_STEPS.filter(
        (step): step is typeof step & { docsUrl: string } =>
          typeof step.docsUrl === "string",
      ),
    );
  });

  it("omits doc links until the Business Accounts docs are published", () => {
    const linked = ALL_STEPS.filter((step) => step.docsUrl);
    // Only the general, already-published pages (client setup, hooks, email
    // sign-in, step-up) keep a link.
    expect(linked.length).toBeGreaterThan(0);
    for (const step of linked) {
      expect(step.docsUrl, step.title).not.toContain("api-reference");
      // A step that calls the business-account surface has no published page
      // to point at - a link there lands the reader on the wrong API. This
      // catches the mixed case too: one BA import is enough.
      expect(step.code, step.title).not.toContain("client/waas");
      expect(step.code, step.title).not.toContain("client/core");
    }
  });

  it("still holds every step to the content rules", () => {
    for (const step of ALL_STEPS) {
      expect(step.num, step.title).toMatch(/^\d\d$/);
      expect(step.title.length, step.title).toBeGreaterThan(0);
      expect(step.prose.length, step.title).toBeGreaterThan(0);
      expect(step.filename.length, step.title).toBeGreaterThan(0);
      expect(step.code.trim().length, step.title).toBeGreaterThan(0);
      if (step.lang === "typescript") {
        expect(step.code, step.title).toMatch(/^import /);
      }
    }
  });

  it("teaches official SDK entry points, not this app's wrappers", () => {
    const businessAccountSteps = [
      ...ACCOUNTS_ACCOUNT_STEPS,
      ...ACCOUNTS_RENAME_STEPS,
      ...ACCOUNTS_WALLET_STEPS,
      ...ACCOUNTS_ADD_WALLET_STEPS,
      ...ACCOUNTS_MEMBER_STEPS,
    ];
    for (const step of businessAccountSteps) {
      // `/waas` for the documented surface, `/core` where the app has to reach
      // one layer down (create, for externalRef + metadata).
      expect(step.code, step.title).toMatch(
        /@dynamic-labs-sdk\/client\/(waas|core)"/,
      );
      expect(step.code, step.title).not.toContain("@/lib/dynamic");
    }
  });

  it("never teaches linking an existing wallet", () => {
    // Out of scope for this demo by decision, not by oversight - see the
    // wallets capability note in AGENTS.md.
    for (const step of ALL_STEPS) {
      expect(step.code, step.title).not.toContain("addWalletToBusinessAccount");
      expect(step.title.toLowerCase()).not.toContain("existing wallet");
    }
  });

  it("leads the signer flow with the step-up elevation", () => {
    const first = ACCOUNTS_SIGNER_STEPS[0]!;
    expect(first.code).toContain("checkStepUpAuth");
    expect(first.code).toContain("requestedScopes");
  });

  it("buildCodeSteps produces highlighted HTML for every step", async () => {
    const steps = await buildCodeSteps(ACCOUNTS_SDK_STEPS.slice(0, 1));
    expect(steps[0]!.html).toContain("shiki");
    expect(steps[0]!.rawCode).toBe(ACCOUNTS_SDK_STEPS[0]!.code);
  });
});
