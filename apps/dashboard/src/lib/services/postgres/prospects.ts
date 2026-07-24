/**
 * Postgres-backed ProspectService (Prisma + Supabase via @dynamic-demos/db).
 *
 * The sole ProspectService implementation (see services/index.ts);
 * behavioural coverage at `../__tests__/prospects.postgres.test.ts`.
 *
 * The row carries every field the ProspectProfile aggregate needs (visual
 * theme, logo discriminator). The palette also lives 1:1 in `ProspectTheme`;
 * every write dual-writes the flat columns on `Prospect` (rollback safety)
 * and the `ProspectTheme` row, and every read loads `ProspectTheme` via a
 * single `include` and overlays it onto the flat columns, falling back to the
 * flat columns when no theme row exists (rows written before this path).
 *
 * D-013: relies on the `prisma` singleton from @dynamic-demos/db so pool usage
 * stays correct. D-015: only apps/dashboard imports @dynamic-demos/db.
 */

import {
  prisma as defaultPrisma,
  type Prisma,
  type PrismaClient,
} from "@dynamic-demos/db";
import {
  type Page,
  type Prospect,
  type ProspectListOptions,
  type ProspectService,
  type CreateProspectInput,
  type UpdateProspectInput,
} from "../types";
import { clampLimit, pageArgs, toPage } from "./pagination";

/** Prospect row with its theme relation, as returned by every read here. */
type ProspectRow = Prisma.ProspectGetPayload<{ include: { theme: true } }>;

/** Palette columns mirrored 1:1 between `Prospect` (flat) and `ProspectTheme`. */
const THEME_FIELD_KEYS = [
  "borderRadius",
  "primaryColor",
  "primaryHoverColor",
  "secondaryColor",
  "accentColor",
  "pageBackground",
  "background",
  "foreground",
  "mutedTextColor",
  "borderColor",
  "rowBackground",
  "rowHoverBackground",
  "gradientFrom",
  "gradientTo",
] as const satisfies ReadonlyArray<keyof Prisma.ProspectThemeCreateManyInput>;

/**
 * Map a Prisma prospect row (+ theme) to the domain `Prospect`. The theme row
 * wins wholesale when present (canonical palette); an absent row leaves the
 * flat columns untouched. The flat columns are 1:1 with the domain shape, so
 * the only mapping is the theme overlay plus the string->union narrowing the
 * DB columns don't carry.
 */
function toProspect(row: ProspectRow): Prospect {
  const { theme, ...flat } = row;
  const merged: Record<string, unknown> = { ...flat };
  if (theme) {
    for (const key of THEME_FIELD_KEYS) {
      merged[key] = theme[key];
    }
  }
  return merged as unknown as Prospect;
}

/**
 * Normalise a `CreateProspectInput` into Prisma create data. `undefined` is
 * widened to `null` for nullable columns so the row always has explicit
 * values; `logo` defaults to "dynamic" and `status` to "ACTIVE".
 */
function fromCreateInput(
  input: CreateProspectInput,
): Prisma.ProspectUncheckedCreateInput {
  return {
    ownerId: input.ownerId,
    teamId: input.teamId ?? null,
    createdById: input.createdById ?? null,
    status: input.status ?? "ACTIVE",
    name: input.name,
    description: input.description ?? null,
    companyUrl: input.companyUrl ?? null,
    logo: input.logo ?? "dynamic",
    logoUrl: input.logoUrl ?? null,
    borderRadius: input.borderRadius ?? null,
    primaryColor: input.primaryColor,
    primaryHoverColor: input.primaryHoverColor ?? null,
    secondaryColor: input.secondaryColor ?? null,
    accentColor: input.accentColor ?? null,
    pageBackground: input.pageBackground ?? null,
    background: input.background ?? null,
    foreground: input.foreground ?? null,
    mutedTextColor: input.mutedTextColor ?? null,
    borderColor: input.borderColor ?? null,
    rowBackground: input.rowBackground ?? null,
    rowHoverBackground: input.rowHoverBackground ?? null,
    gradientFrom: input.gradientFrom ?? null,
    gradientTo: input.gradientTo ?? null,
    domain: input.domain ?? null,
    notes: input.notes ?? null,
  };
}

/**
 * Reduce an `UpdateProspectInput` to only the fields the caller set - each
 * `undefined` is dropped so the update touches only the named columns
 * (explicit `null` still clears a column).
 */
function fromUpdateInput(
  input: UpdateProspectInput,
): Prisma.ProspectUncheckedUpdateInput {
  const data: Prisma.ProspectUncheckedUpdateInput = {};
  const keys: ReadonlyArray<keyof UpdateProspectInput> = [
    "teamId",
    "createdById",
    "status",
    "name",
    "description",
    "companyUrl",
    "logo",
    "logoUrl",
    "borderRadius",
    "primaryColor",
    "primaryHoverColor",
    "secondaryColor",
    "accentColor",
    "pageBackground",
    "background",
    "foreground",
    "mutedTextColor",
    "borderColor",
    "rowBackground",
    "rowHoverBackground",
    "gradientFrom",
    "gradientTo",
    "domain",
    "notes",
  ];
  for (const key of keys) {
    if (input[key] !== undefined) {
      (data as Record<string, unknown>)[key] = input[key];
    }
  }
  return data;
}

/** Pick the `ProspectTheme` palette subset from any source carrying the keys. */
function paletteOf(
  source: Record<string, unknown>,
): Prisma.ProspectThemeCreateWithoutProspectInput {
  const theme = {} as Record<string, unknown>;
  for (const key of THEME_FIELD_KEYS) {
    theme[key] = source[key];
  }
  return theme as Prisma.ProspectThemeCreateWithoutProspectInput;
}

export class PostgresProspectService implements ProspectService {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient = defaultPrisma) {
    this.client = client;
  }

  async create(input: CreateProspectInput): Promise<Prospect> {
    const data = fromCreateInput(input);
    // Nested create writes the prospect and its theme row atomically in one
    // statement; `include` returns both so the read overlay stays trivial.
    const row = await this.client.prospect.create({
      data: { ...data, theme: { create: paletteOf(data) } },
      include: { theme: true },
    });
    return toProspect(row);
  }

  async get(id: string): Promise<Prospect | null> {
    const row = await this.client.prospect.findUnique({
      where: { id },
      include: { theme: true },
    });
    return row ? toProspect(row) : null;
  }

  async list(options: ProspectListOptions = {}): Promise<Page<Prospect>> {
    const limit = clampLimit(options.limit);
    const rows = await this.client.prospect.findMany({
      where: options.where ?? {},
      include: { theme: true },
      ...pageArgs(options),
    });
    return toPage(rows.map(toProspect), limit);
  }

  /** Unpaginated id-only projection - see `ProspectService.listIds`. */
  async listIds(where: Prisma.ProspectWhereInput): Promise<string[]> {
    const rows = await this.client.prospect.findMany({
      where,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async update(id: string, input: UpdateProspectInput): Promise<Prospect> {
    const updateData = fromUpdateInput(input);
    const existing = await this.client.prospect.findUnique({
      where: { id },
      include: { theme: true },
    });
    if (!existing) {
      throw new Error(`Prospect not found: ${id}`);
    }
    // The theme row is written wholesale, so merge the caller's changes over
    // the prospect's current effective palette - this preserves the palette
    // of a prospect whose theme row is being created for the first time.
    const theme = paletteOf({ ...toProspect(existing), ...updateData });
    // Nested upsert keeps the theme row in lockstep with the flat columns in a
    // single atomic statement.
    const row = await this.client.prospect.update({
      where: { id },
      data: {
        ...updateData,
        theme: { upsert: { create: theme, update: theme } },
      },
      include: { theme: true },
    });
    return toProspect(row);
  }

  async delete(id: string): Promise<void> {
    // ProspectTheme FK is `onDelete: Cascade` - no explicit theme delete.
    await this.client.prospect.delete({ where: { id } });
  }

  async upsertWithId(id: string, input: CreateProspectInput): Promise<Prospect> {
    const data = fromCreateInput(input);
    const theme = paletteOf(data);
    const row = await this.client.prospect.upsert({
      where: { id },
      create: { id, ...data, theme: { create: theme } },
      update: { ...data, theme: { upsert: { create: theme, update: theme } } },
      include: { theme: true },
    });
    return toProspect(row);
  }
}
