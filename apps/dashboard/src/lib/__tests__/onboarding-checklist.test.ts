import { describe, it, expect } from "vitest";

import {
  computeChecklistCompletion,
  isChecklistComplete,
  type ChecklistCompletionInput,
} from "../onboarding-checklist";

const allDone: ChecklistCompletionInput = {
  profileComplete: true,
  hasProspect: true,
  hasDemo: true,
  hasShare: true,
};

const noneDone: ChecklistCompletionInput = {
  profileComplete: false,
  hasProspect: false,
  hasDemo: false,
  hasShare: false,
};

describe("computeChecklistCompletion", () => {
  it("maps each boolean onto its item id", () => {
    expect(computeChecklistCompletion(allDone)).toEqual({
      profile: true,
      prospect: true,
      demo: true,
      share: true,
    });
  });

  it("keeps items independent - one true does not imply the others", () => {
    const completion = computeChecklistCompletion({
      ...noneDone,
      hasProspect: true,
    });
    expect(completion).toEqual({
      profile: false,
      prospect: true,
      demo: false,
      share: false,
    });
  });
});

describe("isChecklistComplete", () => {
  it("is true only when every item is done", () => {
    expect(isChecklistComplete(computeChecklistCompletion(allDone))).toBe(
      true,
    );
  });

  it("is false when any single item is missing", () => {
    expect(
      isChecklistComplete(computeChecklistCompletion(noneDone)),
    ).toBe(false);

    expect(
      isChecklistComplete(
        computeChecklistCompletion({ ...allDone, hasShare: false }),
      ),
    ).toBe(false);
  });

  it("is false with no items done", () => {
    expect(isChecklistComplete(computeChecklistCompletion(noneDone))).toBe(
      false,
    );
  });
});
