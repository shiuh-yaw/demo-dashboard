import { describe, expect, it } from "vitest";

import {
  LegalTransitions,
  TerminalStates,
  TransactionState,
} from "../state";

describe("TransactionState enum", () => {
  it("exposes all canonical states with self-keyed values", () => {
    expect(TransactionState).toEqual({
      initialized: "initialized",
      draft: "draft",
      submitted: "submitted",
      pending: "pending",
      confirmed: "confirmed",
      expired: "expired",
      abandoned: "abandoned",
      failed: "failed",
      cancelled: "cancelled",
    });
  });
});

describe("LegalTransitions table", () => {
  it("permits initialized → draft, expired, cancelled (only)", () => {
    expect(LegalTransitions.initialized).toEqual([
      "draft",
      "expired",
      "cancelled",
    ]);
  });

  it("permits draft → submitted, abandoned, cancelled (only)", () => {
    expect(LegalTransitions.draft).toEqual([
      "submitted",
      "abandoned",
      "cancelled",
    ]);
  });

  it("permits submitted → pending, failed, cancelled (only)", () => {
    expect(LegalTransitions.submitted).toEqual([
      "pending",
      "failed",
      "cancelled",
    ]);
  });

  it("permits pending → confirmed, failed (only)", () => {
    expect(LegalTransitions.pending).toEqual(["confirmed", "failed"]);
  });

  it("treats every terminal state as transitionless", () => {
    for (const terminal of [
      "confirmed",
      "expired",
      "abandoned",
      "failed",
      "cancelled",
    ] as const) {
      expect(LegalTransitions[terminal]).toEqual([]);
    }
  });

  it("has an entry for every TransactionState (no orphan keys)", () => {
    const stateValues = Object.values(TransactionState).sort();
    const transitionKeys = Object.keys(LegalTransitions).sort();
    expect(transitionKeys).toEqual(stateValues);
  });
});

describe("TerminalStates set", () => {
  it("contains exactly the five terminal states", () => {
    expect(TerminalStates.size).toBe(5);
    for (const terminal of [
      "confirmed",
      "expired",
      "abandoned",
      "failed",
      "cancelled",
    ] as const) {
      expect(TerminalStates.has(terminal)).toBe(true);
    }
  });

  it("does not contain any non-terminal state", () => {
    for (const nonTerminal of [
      "initialized",
      "draft",
      "submitted",
      "pending",
    ] as const) {
      expect(TerminalStates.has(nonTerminal)).toBe(false);
    }
  });
});
