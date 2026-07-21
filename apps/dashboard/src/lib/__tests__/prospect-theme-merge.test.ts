import { describe, expect, it } from "vitest";
import { applyProspectTheme } from "../prospect-theme-merge";

const DEFAULTS = {
  primaryColor: "#4779FF",
  accentColor: "#1967D2",
  background: "#ffffff",
};

describe("applyProspectTheme", () => {
  it("applies the full prospect theme when every field is still at default", () => {
    const current = { ...DEFAULTS };
    const incoming = {
      primaryColor: "#ff0000",
      accentColor: "#00ff00",
      background: "#0000ff",
    };

    const result = applyProspectTheme(current, DEFAULTS, incoming);

    expect(result).toEqual(incoming);
  });

  it("keeps user-customized fields untouched and only fills defaulted ones", () => {
    const current = {
      primaryColor: "#custom", // user already changed this
      accentColor: DEFAULTS.accentColor, // still default
      background: DEFAULTS.background, // still default
    };
    const incoming = {
      primaryColor: "#ff0000",
      accentColor: "#00ff00",
      background: "#0000ff",
    };

    const result = applyProspectTheme(current, DEFAULTS, incoming);

    expect(result.primaryColor).toBe("#custom");
    expect(result.accentColor).toBe("#00ff00");
    expect(result.background).toBe("#0000ff");
  });

  it("never overwrites with undefined, null, or empty-string incoming values", () => {
    const current = { ...DEFAULTS };
    const incoming = {
      primaryColor: undefined,
      accentColor: null as unknown as string | undefined,
      background: "",
    };

    const result = applyProspectTheme(current, DEFAULTS, incoming);

    expect(result).toEqual(current);
  });

  it("leaves the form fully untouched when incoming is empty (Unbound selection)", () => {
    const current = {
      primaryColor: "#custom",
      accentColor: DEFAULTS.accentColor,
      background: "#alsoCustom",
    };

    const result = applyProspectTheme(current, DEFAULTS, {});

    expect(result).toEqual(current);
  });

  it("does not mutate the current object in place", () => {
    const current = { ...DEFAULTS };
    const incoming = { primaryColor: "#ff0000" };

    applyProspectTheme(current, DEFAULTS, incoming);

    expect(current).toEqual(DEFAULTS);
  });
});
