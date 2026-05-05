import { describe, expect, it } from "vitest";

import {
  abandon,
  cancel,
  confirm,
  draft,
  expire,
  fail,
  pending,
  submit,
  transition,
} from "../machine";
import { LegalTransitions, TransactionState } from "../state";
import { IllegalTransitionError } from "../validators";

type Helper = (
  t: { state: TransactionState; [k: string]: unknown }
) => { state: TransactionState; [k: string]: unknown };

const HELPERS: Record<
  Exclude<TransactionState, "initialized">,
  Helper
> = {
  draft: (t) => draft(t),
  submitted: (t) => submit(t),
  pending: (t) => pending(t),
  confirmed: (t) => confirm(t),
  expired: (t) => expire(t),
  abandoned: (t) => abandon(t),
  failed: (t) => fail(t),
  cancelled: (t) => cancel(t),
};

const ALL_STATES = Object.values(TransactionState);

describe("transition helpers — legal transitions", () => {
  for (const from of ALL_STATES) {
    for (const to of LegalTransitions[from]) {
      it(`${from} → ${to} succeeds and sets state to "${to}"`, () => {
        const helper = HELPERS[to as Exclude<TransactionState, "initialized">];
        const before = { state: from, id: "tx_1", payload: { foo: "bar" } };
        const after = helper(before);
        expect(after.state).toBe(to);
      });
    }
  }
});

describe("transition helpers — illegal transitions", () => {
  for (const from of ALL_STATES) {
    const allowed = new Set(LegalTransitions[from]);
    for (const to of ALL_STATES) {
      if (allowed.has(to)) continue;
      if (to === "initialized") continue; // no helper to enter `initialized`
      it(`${from} → ${to} throws IllegalTransitionError`, () => {
        const helper = HELPERS[to as Exclude<TransactionState, "initialized">];
        const before = { state: from, id: "tx_1" };
        expect(() => helper(before)).toThrowError(IllegalTransitionError);
      });
    }
  }
});

describe("transition helpers — immutability + field preservation", () => {
  it("returns a new object (does not mutate the input)", () => {
    const before = { state: "initialized" as TransactionState, id: "tx_1" };
    const after = draft(before);
    expect(after).not.toBe(before);
    expect(before.state).toBe("initialized");
    expect(after.state).toBe("draft");
  });

  it("preserves unrelated fields across transitions", () => {
    const before = {
      state: "submitted" as TransactionState,
      id: "tx_42",
      payload: { foo: "bar", n: 7 },
      createdAt: "2026-01-01T00:00:00Z",
      meta: { trace: "abc" },
    };
    const after = pending(before);
    expect(after.state).toBe("pending");
    expect(after.id).toBe("tx_42");
    expect(after.payload).toEqual({ foo: "bar", n: 7 });
    expect(after.createdAt).toBe("2026-01-01T00:00:00Z");
    expect(after.meta).toEqual({ trace: "abc" });
  });
});

describe("terminal states reject all helpers", () => {
  for (const terminal of [
    "confirmed",
    "expired",
    "abandoned",
    "failed",
    "cancelled",
  ] as const) {
    it(`${terminal} rejects every transition helper`, () => {
      const before = { state: terminal as TransactionState, id: "tx_1" };
      // Every helper that targets a non-`initialized` state must throw,
      // because terminal LegalTransitions[*] === [].
      for (const helper of Object.values(HELPERS)) {
        expect(() => helper(before)).toThrowError(IllegalTransitionError);
      }
    });
  }
});

describe("generic transition()", () => {
  it("dispatches to the legal target state", () => {
    const before = { state: "initialized" as TransactionState, id: "tx_1" };
    const after = transition(before, "draft");
    expect(after.state).toBe("draft");
  });

  it("throws IllegalTransitionError when target is not legal from current", () => {
    const before = { state: "initialized" as TransactionState, id: "tx_1" };
    expect(() => transition(before, "confirmed")).toThrowError(
      IllegalTransitionError
    );
  });

  it("accepts an optional TransitionContext without affecting the result", () => {
    const before = { state: "draft" as TransactionState, id: "tx_1" };
    const after = transition(before, "submitted", {
      reason: "user-confirmed",
      metadata: { ip: "1.2.3.4" },
    });
    expect(after.state).toBe("submitted");
    expect(after.id).toBe("tx_1");
  });
});
