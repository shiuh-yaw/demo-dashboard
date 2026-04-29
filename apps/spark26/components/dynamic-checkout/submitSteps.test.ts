import { describe, it, expect } from "vitest";
import { deriveSignStepStatus, type SubmitStepId } from "./submitSteps.js";

const S = (...ids: SubmitStepId[]): Set<SubmitStepId> => new Set(ids);

describe("deriveSignStepStatus", () => {
  it("returns pending before any step has started", () => {
    expect(deriveSignStepStatus("approval", null, S())).toBe("pending");
    expect(deriveSignStepStatus("transaction", null, S())).toBe("pending");
  });

  it("returns active for the currently-announced step", () => {
    expect(deriveSignStepStatus("approval", "approval", S("approval"))).toBe(
      "active",
    );
    expect(
      deriveSignStepStatus("transaction", "transaction", S("transaction")),
    ).toBe("active");
  });

  it("marks earlier step as done once current moves forward", () => {
    expect(
      deriveSignStepStatus(
        "approval",
        "transaction",
        S("approval", "transaction"),
      ),
    ).toBe("done");
    expect(
      deriveSignStepStatus(
        "transaction",
        "transaction",
        S("approval", "transaction"),
      ),
    ).toBe("active");
  });

  it("marks approval as skipped when flow jumps straight to transaction (native gas)", () => {
    expect(
      deriveSignStepStatus("approval", "transaction", S("transaction")),
    ).toBe("skipped");
    expect(
      deriveSignStepStatus("transaction", "transaction", S("transaction")),
    ).toBe("active");
  });

  it("keeps transaction pending while approval is active", () => {
    expect(
      deriveSignStepStatus("transaction", "approval", S("approval")),
    ).toBe("pending");
  });

  it("still reports approval as skipped once the whole flow completes and current resets to null", () => {
    // After submitCheckoutTransaction resolves, the view unmounts — but the
    // stepper may render one more time with current=null. For a native-gas
    // flow where we never saw approval, the approval row should still show
    // "skipped" (not flip back to "pending") so the user sees consistent
    // state through the final render.
    expect(deriveSignStepStatus("approval", null, S("transaction"))).toBe(
      "skipped",
    );
  });
});
