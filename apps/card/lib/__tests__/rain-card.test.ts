import { describe, expect, it } from "vitest";

import { getRainCardFromUser, type RainCard } from "../rain-card";

const FIXTURE_CARD: RainCard = {
  id: "c1",
  userId: "u1",
  type: "virtual",
  status: "active",
  limit: { amount: 1000, frequency: "per30DayPeriod" },
  last4: "1234",
  expirationMonth: "12",
  expirationYear: "2030",
};

describe("getRainCardFromUser", () => {
  it("returns the rainCard from user metadata", () => {
    const user = { metadata: { rainCard: FIXTURE_CARD } };
    expect(getRainCardFromUser(user)).toEqual(FIXTURE_CARD);
  });

  it("returns null when there is no card", () => {
    const user = { metadata: {} };
    expect(getRainCardFromUser(user)).toBeNull();
  });

  it("returns null when user is null or undefined", () => {
    expect(getRainCardFromUser(null)).toBeNull();
    expect(getRainCardFromUser(undefined)).toBeNull();
  });
});
