import { describe, expect, it } from "vitest";

import { appConfig } from "../app.config";
import {
  BASE_SEPOLIA_ID,
  RUSDC_ADDRESS,
  RUSDC_DECIMALS,
} from "../lib/constants";

describe("apps/card scaffold", () => {
  it("uses client-side auth config (kyc none, flat routes)", () => {
    expect(appConfig.kyc).toBe("none");
    expect(appConfig.routePattern).toBe("flat");
    expect(appConfig.auth.emailOtp).toBe(true);
  });

  it("targets Base Sepolia RUSDC with 6 decimals", () => {
    expect(BASE_SEPOLIA_ID).toBe(84532);
    expect(RUSDC_ADDRESS.toLowerCase()).toBe(
      "0x10b5be494c2962a7b318afb63f0ee30b959d000b",
    );
    expect(RUSDC_DECIMALS).toBe(6);
  });
});
