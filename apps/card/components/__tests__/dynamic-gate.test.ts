import { describe, it, expect } from "vitest";
import { resolveGateState } from "../dynamic-gate";

describe("resolveGateState", () => {
  it("renders the spinner while init is in progress", () => {
    expect(resolveGateState("in-progress")).toBe("spinner");
  });

  it("renders the spinner while uninitialized", () => {
    expect(resolveGateState("uninitialized")).toBe("spinner");
  });

  it("renders the spinner when init status is not yet known", () => {
    expect(resolveGateState(undefined)).toBe("spinner");
  });

  it("renders the error state when init failed", () => {
    expect(resolveGateState("failed")).toBe("error");
  });

  it("renders children once init has finished", () => {
    expect(resolveGateState("finished")).toBe("ready");
  });
});
