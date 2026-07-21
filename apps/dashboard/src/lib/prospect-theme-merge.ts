import type { AppearanceTheme } from "@/components/shared/appearance-form";
import type { ProspectOptionTheme } from "@/lib/actions/prospects";

/**
 * Pure merge helper for auto-applying a prospect's stored theme onto a
 * demo-config Appearance form when the user selects that prospect.
 *
 * Clobber rule: a field only takes the prospect's value when it still equals
 * the built-in default (i.e. the user has not customized it). Fields the
 * user already changed are left untouched. Missing/empty incoming values
 * never overwrite anything.
 */
export function applyProspectTheme<T extends object>(
  current: T,
  defaults: Partial<T>,
  incoming: Partial<T>,
): T {
  const result = { ...current };

  (Object.keys(current) as (keyof T)[]).forEach((key) => {
    const incomingValue = incoming[key];
    if (incomingValue === undefined || incomingValue === null || incomingValue === "") {
      return;
    }
    if (current[key] === defaults[key]) {
      result[key] = incomingValue as T[keyof T];
    }
  });

  return result;
}

/** Maps a picker option's theme (null-heavy, Postgres-shaped) onto the Appearance form's field names. */
export function prospectOptionThemeToAppearance(
  theme: ProspectOptionTheme,
): Partial<AppearanceTheme> {
  return {
    primaryColor: theme.primaryColor ?? undefined,
    primaryHoverColor: theme.primaryHoverColor ?? undefined,
    accentColor: theme.accentColor ?? undefined,
    pageBackground: theme.pageBackground ?? undefined,
    background: theme.background ?? undefined,
    foreground: theme.foreground ?? undefined,
    mutedTextColor: theme.mutedTextColor ?? undefined,
    borderColor: theme.borderColor ?? undefined,
    rowBackground: theme.rowBackground ?? undefined,
    rowHoverBackground: theme.rowHoverBackground ?? undefined,
    gradientFrom: theme.gradientFrom ?? undefined,
    gradientTo: theme.gradientTo ?? undefined,
    borderRadius: (theme.borderRadius ?? undefined) as AppearanceTheme["borderRadius"],
  };
}
