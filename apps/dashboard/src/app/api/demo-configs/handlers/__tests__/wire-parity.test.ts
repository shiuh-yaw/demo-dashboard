/**
 * Wire-parity gate for the demo-app-facing `branding.*` JSON (GTM-03.5B).
 *
 * `GET /api/demo-configs/[kind]/[id]` (`handleGetDemoConfig`) returns
 * `MAPPERS[kind].toStored(record, prospect).config` verbatim to demo apps
 * (see `../get-demo-config.ts`). None of `toStored()`'s bodies changed in
 * this cutover - only how `prospectId`/theme values are *sourced*
 * upstream (explicit FK instead of hash-resolution; ProspectTheme-joined
 * Prospect instead of flat-only). This test freezes the exact `config`
 * shape each mapper serves for a representative fixture so a future
 * refactor of any mapper or the Prospect read path trips CI the moment
 * the wire shape drifts.
 */

import { describe, expect, it } from "vitest";

import { earnMapper } from "@/lib/services/demo-config-mappers/earn";
import { walletMapper } from "@/lib/services/demo-config-mappers/wallet";
import { tradeMapper } from "@/lib/services/demo-config-mappers/trade";
import { visaDirectMapper } from "@/lib/services/demo-config-mappers/visa-direct";
import { checkoutMapper } from "@/lib/services/demo-config-mappers/checkout";
import { remittanceMapper } from "@/lib/services/demo-config-mappers/remittance";
import type { DemoConfigRecord, Prospect } from "@/lib/services/types";

const FIXTURE_PROSPECT: Prospect = {
  id: "prospect_fixture",
  ownerId: "owner_fixture",
  teamId: null,
  createdById: "user_fixture",
  status: "ACTIVE",
  name: "Fixture Co",
  description: null,
  companyUrl: "https://fixture.example",
  logo: "custom",
  logoUrl: "https://fixture.example/logo.png",
  borderRadius: "md",
  primaryColor: "#4779FF",
  primaryHoverColor: "#3968E8",
  secondaryColor: "#1E40AF",
  accentColor: "#1967D2",
  pageBackground: "#f6f8fa",
  background: "#ffffff",
  foreground: "#0e121b",
  mutedTextColor: "#99a0ae",
  borderColor: "#e1e4ea",
  rowBackground: "#f8f9fb",
  rowHoverBackground: "#eef1f1",
  gradientFrom: "#daffff",
  gradientTo: "transparent",
  domain: "fixture.example",
  notes: null,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
};

function baseRecord(
  overrides: Partial<DemoConfigRecord>,
): DemoConfigRecord {
  return {
    id: "config_fixture",
    kind: "earn",
    ownerId: "owner_fixture",
    createdById: "user_fixture",
    name: "Fixture Config",
    description: null,
    prospectId: FIXTURE_PROSPECT.id,
    isPrimary: false,
    themeOverrides: null,
    config: {},
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("wire-parity: branding.* JSON served to demo apps", () => {
  it("earnMapper.toStored().config is byte-identical for the fixture", () => {
    const record = baseRecord({
      kind: "earn",
      config: {
        theme: { primaryColor: "#000000" },
        branding: { logo: "dynamic", tokenName: "USDC" },
        layout: { showSidebar: true },
      },
    });
    const config = earnMapper.toStored(record, FIXTURE_PROSPECT).config;
    expect(JSON.stringify(config)).toMatchSnapshot();
  });

  it("walletMapper.toStored().config is byte-identical for the fixture", () => {
    const record = baseRecord({
      kind: "wallet",
      config: {
        theme: { primaryColor: "#000000" },
        branding: { logo: "https://config.example/logo.png" },
      },
    });
    const config = walletMapper.toStored(record, FIXTURE_PROSPECT).config;
    expect(JSON.stringify(config)).toMatchSnapshot();
  });

  it("tradeMapper.toStored().config is byte-identical for the fixture", () => {
    const record = baseRecord({
      kind: "trade",
      config: { branding: { appName: "NovaX" } },
    });
    const config = tradeMapper.toStored(record, FIXTURE_PROSPECT).config;
    expect(JSON.stringify(config)).toMatchSnapshot();
  });

  it("visaDirectMapper.toStored().config is byte-identical for the fixture", () => {
    const record = baseRecord({
      kind: "visa-direct",
      config: {
        branding: { bannerText: "Demo" },
        theme: { primaryColor: "#000000" },
      },
    });
    const config = visaDirectMapper.toStored(record, FIXTURE_PROSPECT).config;
    expect(JSON.stringify(config)).toMatchSnapshot();
  });

  it("checkoutMapper.toStored().config is byte-identical for the fixture", () => {
    const record = baseRecord({
      kind: "checkout",
      config: {
        mode: "payment",
        _checkoutMode: "payment",
        theme: { primaryColor: "#000000" },
        branding: { logo: "https://config.example/logo.png" },
      },
    });
    const config = checkoutMapper.toStored(record, FIXTURE_PROSPECT).config;
    expect(JSON.stringify(config)).toMatchSnapshot();
  });

  it("remittanceMapper.toStored().config is byte-identical for the fixture", () => {
    const record = baseRecord({
      kind: "remittance",
      config: {
        theme: { primaryColor: "#000000" },
        branding: {},
      },
    });
    const config = remittanceMapper.toStored(record, FIXTURE_PROSPECT).config;
    expect(JSON.stringify(config)).toMatchSnapshot();
  });

  it("unbound config (prospectId null) never throws and omits Prospect-sourced fields", () => {
    const record = baseRecord({
      kind: "earn",
      prospectId: null,
      config: {
        theme: { primaryColor: "#123456" },
        branding: { logo: "dynamic" },
        layout: {},
      },
    });
    const config = earnMapper.toStored(record, null).config;
    expect(JSON.stringify(config)).toBe(
      JSON.stringify({
        theme: { primaryColor: "#123456" },
        branding: { logo: "dynamic" },
        layout: {},
      }),
    );
  });
});
