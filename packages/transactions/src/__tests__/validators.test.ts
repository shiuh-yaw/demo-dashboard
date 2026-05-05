import { describe, expect, it } from "vitest";

import { LegalTransitions, TransactionState } from "../state";
import {
  IllegalTransitionError,
  assertValidTransition,
  isTerminal,
} from "../validators";

const ALL_STATES = Object.values(TransactionState);

describe("assertValidTransition", () => {
  it("permits every transition listed in LegalTransitions", () => {
    for (const from of ALL_STATES) {
      for (const to of LegalTransitions[from]) {
        expect(() => assertValidTransition(from, to)).not.toThrow();
      }
    }
  });

  it("throws IllegalTransitionError for every transition NOT in LegalTransitions", () => {
    for (const from of ALL_STATES) {
      const allowed = new Set(LegalTransitions[from]);
      for (const to of ALL_STATES) {
        if (allowed.has(to)) continue;
        expect(() => assertValidTransition(from, to)).toThrowError(
          IllegalTransitionError
        );
      }
    }
  });

  it("attaches from and to on the thrown error", () => {
    try {
      assertValidTransition("initialized", "confirmed");
      throw new Error("expected IllegalTransitionError");
    } catch (err) {
      expect(err).toBeInstanceOf(IllegalTransitionError);
      const tErr = err as IllegalTransitionError;
      expect(tErr.from).toBe("initialized");
      expect(tErr.to).toBe("confirmed");
      expect(tErr.message).toContain("initialized");
      expect(tErr.message).toContain("confirmed");
    }
  });

  it("rejects no-op self-transitions (state never legally re-enters itself)", () => {
    for (const s of ALL_STATES) {
      expect(() => assertValidTransition(s, s)).toThrowError(
        IllegalTransitionError
      );
    }
  });
});

describe("isTerminal", () => {
  it("returns true for every terminal state", () => {
    for (const t of ["confirmed", "expired", "abandoned", "failed", "cancelled"] as const) {
      expect(isTerminal(t)).toBe(true);
    }
  });

  it("returns false for every non-terminal state", () => {
    for (const n of ["initialized", "draft", "submitted", "pending"] as const) {
      expect(isTerminal(n)).toBe(false);
    }
  });
});
