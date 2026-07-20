/**
 * Shared raw-Prisma row shapes read by more than one Postgres service
 * module (`User`, `Prospect`) - `PostgresShareLinkService` reads both in
 * addition to their owning services.
 *
 * Enum-ish columns (`logo`, `borderRadius`, `role`) stay plain `string` /
 * `string | null` here, matching the raw column Prisma returns; this row
 * shape stays Prisma-decoupled on purpose (see `UserPrismaClient` in
 * `postgres/users.ts`, satisfied by a hand-rolled fake in tests). Each
 * service's `toX` mapper narrows to the literal domain type after
 * reading.
 *
 * `UserRow` mirrors the Prisma `User` model; the exposed TS domain type is
 * `GtmUser`, not `User`, to avoid clashing with the unrelated `User` type
 * already exported by `@/lib/types/dashboard` for the legacy per-checkout
 * wallet user.
 */

export interface UserRow {
  id: string;
  email: string;
  dynamicUserId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  schedulingUrl: string | null;
  role: string;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamRow {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface TeamMembershipRow {
  id: string;
  userId: string;
  teamId: string;
  createdAt: Date;
}

export interface ProspectRow {
  id: string;
  ownerId: string;
  teamId: string;
  createdById: string | null;
  status: string;
  name: string;
  description: string | null;
  companyUrl: string | null;
  logo: string;
  logoUrl: string | null;
  borderRadius: string | null;
  primaryColor: string;
  primaryHoverColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  pageBackground: string | null;
  background: string | null;
  foreground: string | null;
  mutedTextColor: string | null;
  borderColor: string | null;
  rowBackground: string | null;
  rowHoverBackground: string | null;
  gradientFrom: string | null;
  gradientTo: string | null;
  demoEarnId: string | null;
  demoCheckoutsId: string | null;
  demoWalletId: string | null;
  demoRemittanceId: string | null;
  domain: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
