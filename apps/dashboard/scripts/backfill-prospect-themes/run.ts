/**
 * Copies the flat Prospect palette into `ProspectTheme` for every Prospect
 * that lacks a row. Idempotent (`INSERT ... WHERE NOT EXISTS`). Deps are
 * injected so unit tests avoid a real database.
 */

export interface ProspectThemesDeps {
  /** Count Prospects with no ProspectTheme row. */
  countMissing: () => Promise<number>;
  /** Insert the missing rows; returns the number copied. */
  copyMissing: () => Promise<number>;
  dryRun?: boolean;
  log?: (msg: string) => void;
}

export interface ProspectThemesReport {
  /** Missing before the run (what a copy would/did address). */
  missing: number;
  /** Rows actually inserted (0 in dry-run). */
  copied: number;
  dryRun: boolean;
}

export async function runProspectThemesBackfill(
  deps: ProspectThemesDeps,
): Promise<ProspectThemesReport> {
  const log = deps.log ?? (() => {});
  const dryRun = deps.dryRun ?? false;
  const missing = await deps.countMissing();
  if (dryRun) {
    log(`would copy ${missing} missing ProspectTheme row(s)`);
    return { missing, copied: 0, dryRun: true };
  }
  const copied = await deps.copyMissing();
  log(`copied ${copied} ProspectTheme row(s)`);
  return { missing, copied, dryRun: false };
}
