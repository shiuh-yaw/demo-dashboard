import { describe, expect, it } from "vitest";
import { isActionProtected } from "../lib/dynamic/mfa";

/**
 * Shape copied from a live `GET /api/v0/sdk/<env>/settings`: session MFA off,
 * enrollment "action", and export the one protected action. This is the
 * config that made an unenrolled user skip the step-up and hit a backend
 * rejection, because `isMfaRequiredForAction` answers per user, not per
 * environment.
 */
const MFA_CONFIG = {
  enabled: false,
  enrollment: "action",
  actions: [
    { action: "wallet.waas.reshare", required: false },
    { action: "wallet.waas.sign", required: false },
    { action: "wallet.waas.export", required: true },
    { action: "wallet.waas.refresh", required: false },
    { action: "user.update", required: false },
  ],
  methods: [{ type: "totp", enabled: true }],
};

describe("isActionProtected", () => {
  it("reports a protected action regardless of what the user enrolled", () => {
    expect(isActionProtected(MFA_CONFIG, "wallet.waas.export")).toBe(true);
  });

  it("does not leak protection across actions", () => {
    expect(isActionProtected(MFA_CONFIG, "wallet.waas.sign")).toBe(false);
  });

  it("treats an action absent from the list as unprotected", () => {
    expect(isActionProtected(MFA_CONFIG, "wallet.waas.unknown")).toBe(false);
  });

  it("handles settings that have not loaded", () => {
    expect(isActionProtected(undefined, "wallet.waas.export")).toBe(false);
    expect(isActionProtected(null, "wallet.waas.export")).toBe(false);
    expect(isActionProtected({}, "wallet.waas.export")).toBe(false);
  });
});
