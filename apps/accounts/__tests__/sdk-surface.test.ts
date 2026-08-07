/**
 * Pins the published-SDK limitations this app works around, so the workaround
 * is removed when the SDK catches up instead of outliving it.
 *
 * These are `@ts-expect-error` assertions, which invert on purpose: the moment
 * the SDK accepts the field, the directive becomes unnecessary and `tsc` fails
 * with "Unused '@ts-expect-error' directive" — pointing at the exact line, with
 * the follow-up written next to it. A note in AGENTS.md only helps someone who
 * reads it; this tells whoever bumps the version.
 *
 * Runtime is checked too, because the two have already disagreed here: the
 * compiled 1.25.0 `createBusinessAccount` sends `{ name: params?.name }`, so a
 * passed `externalRef` is silently dropped rather than rejected. A types-only
 * assertion would not have caught that.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  addBusinessAccountSigner,
  createBusinessAccount,
  listBusinessAccounts,
  type BusinessAccountMember,
  type BusinessAccountSigner,
} from "@dynamic-labs-sdk/client/waas";

const require_ = createRequire(import.meta.url);

/** The published bundle, read rather than executed (it needs a browser). */
function waasBundle(): string {
  const pkg = require_.resolve("@dynamic-labs-sdk/client/package.json");
  return readFileSync(pkg.replace(/package\.json$/, "dist/waas.esm.js"), "utf8");
}

describe("createBusinessAccount cannot set externalRef or metadata", () => {
  it("rejects them at the type level", () => {
    // @ts-expect-error - REMOVE when the wrapper accepts externalRef, then
    // collapse `createBusinessAccount` in `lib/dynamic/business-accounts.ts`
    // back onto it (the app reaches the field through `createApiClient` today)
    // and simplify ACCOUNTS_ACCOUNT_STEPS step 01 in `lib/code-steps.ts`.
    void (() => createBusinessAccount({ name: "x", externalRef: "acme-1" }));

    // @ts-expect-error - REMOVE when the SDK accepts metadata.
    void (() => createBusinessAccount({ name: "x", metadata: { a: 1 } }));

    expect(typeof createBusinessAccount).toBe("function");
  });

  it("drops them at runtime too - only `name` reaches the request", () => {
    // Matching the compiled request literal: a types-only check would pass
    // while the value was still being thrown away.
    expect(waasBundle()).toContain(
      "createBusinessAccountSdkRequest: { name: params?.name }",
    );
  });
});

describe("the API never reports who a member or signer is", () => {
  it("pins the shapes the roster comes back as", () => {
    // The reason `lib/business-accounts/member-emails.ts` exists. When these
    // gain an identifier (`email`/`identifier`) or `addBusinessAccountSigner`
    // starts reporting the user it resolved, delete that module and read the
    // address straight off the row.
    const member: BusinessAccountMember = {
      id: "m1",
      businessAccountId: "acct-1",
      userId: "user-1",
      role: "admin",
    };
    // @ts-expect-error - REMOVE when a member carries an identifier.
    void member.email;

    const signer: BusinessAccountSigner = {
      id: "s1",
      businessAccountId: "acct-1",
      walletId: "w1",
      type: "endUser",
    };
    // A signer at least has a `userId`, so the member cache covers it.
    expect(signer.userId).toBeUndefined();

    // ...but the add call resolves to a share set alone, so there is no id to
    // pair the typed address with at invite time.
    // @ts-expect-error - REMOVE when the call reports the resolved user.
    void (async () => (await addBusinessAccountSigner({} as never)).userId);
  });
});

describe("listBusinessAccounts takes no filter", () => {
  it("rejects an externalRefs query at the type level", () => {
    // @ts-expect-error - REMOVE when the SDK accepts a filter. Until then a
    // caller wanting one account by ref must list and match locally.
    void (() => listBusinessAccounts({ externalRefs: ["acme-1"] }));

    expect(typeof listBusinessAccounts).toBe("function");
  });
});
