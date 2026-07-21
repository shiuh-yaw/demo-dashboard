import { describe, expect, it } from "vitest";

import { deriveGeo } from "./geo";

describe("deriveGeo", () => {
  it("reads country/region/city from Vercel geo headers", () => {
    const headers = new Headers({
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "CA",
      "x-vercel-ip-city": "San%20Francisco",
    });
    expect(deriveGeo(headers)).toEqual({
      country: "US",
      region: "CA",
      city: "San Francisco",
    });
  });

  it("returns undefined fields when headers are absent", () => {
    expect(deriveGeo(new Headers())).toEqual({
      country: undefined,
      region: undefined,
      city: undefined,
    });
  });

  it("falls back to the raw city value if it isn't valid percent-encoding", () => {
    const headers = new Headers({ "x-vercel-ip-city": "Sao%" });
    expect(deriveGeo(headers).city).toBe("Sao%");
  });
});
