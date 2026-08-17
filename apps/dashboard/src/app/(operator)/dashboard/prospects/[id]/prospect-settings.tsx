"use client";

/**
 * Prospect settings: Basic Info (name, website, logo - logo is basic info,
 * not a theme), the prospect-global Brand Theme colors (shared by every
 * demo), and Ownership (owner + team reassignment). Laid out as console
 * settings-section blocks (two-column on md+) matching Profile/Admin, each
 * section's fields in its own bordered card - one card per section, no
 * card-in-card. Every section - including Ownership - shares the one
 * dirty-state Save/Reset bar: picking a new owner/team only stages the
 * change (it reshapes prospect visibility, so it must never apply on
 * select). Saving an ownership change opens a confirmation dialog first.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import type { ProspectProfile, ProspectTheme } from "@/lib/types/dashboard";
import {
  updateProspectProfile,
  reassignProspectOwner,
  reassignProspectTeam,
  deleteProspectProfile,
} from "@/lib/actions/prospects";
import type { AdminUserView } from "@/lib/actions/team-views";
import type { Team } from "@/lib/services";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Spinner,
  UnsavedChangesBar,
} from "@/components/droplet-client";
import { SettingsSection } from "@/components/settings-section";
import { SECTION_CARD } from "@/components/shared/section-card";
import { THIN_SCROLLBAR } from "@/components/shared/thin-scrollbar";
import { LogoField } from "@/components/shared/logo-field";
import { AiStyleImport } from "@/app/(operator)/checkouts/components/editor/ai-style-import";
import { Field } from "@/app/(operator)/checkouts/components/editor/form-components";
import { toastSuccess, toastError } from "@/lib/toast";
import {
  AppearanceForm,
  AppearanceTheme,
  AppearanceBranding,
  AppearanceConfig,
  DEFAULT_APPEARANCE_THEME,
} from "@/components/shared/appearance-form";
import { suppressAutofill } from "@/lib/suppress-autofill";

interface ProspectSettingsProps {
  profile: ProspectProfile;
  /** Active workspace users eligible to become the new owner. */
  assignableUsers: AdminUserView[];
  /** Teams eligible to own this prospect. */
  assignableTeams: Team[];
  /** Server-computed: only the current owner or an ADMIN/OWNER may reassign. */
  canReassignOwnership: boolean;
}

function initialTheme(profile: ProspectProfile): AppearanceTheme {
  return {
    primaryColor: profile.prospect.primaryColor,
    accentColor: profile.prospect.accentColor || profile.prospect.primaryColor,
    borderRadius: profile.prospect.borderRadius || "md",
    ...(profile.prospect.theme || {}),
  };
}

function personLabel(u: {
  displayName: string | null;
  email: string;
  deactivated?: boolean;
}): string {
  const base = u.displayName ?? u.email;
  return u.deactivated ? `${base} (deactivated)` : base;
}

/** Current owner as a User.id: resolvedOwnerId (server-resolved, see prospects.ts) falling back to createdById for a stale/legacy profile shape. */
function currentOwnerId(profile: ProspectProfile): string | null {
  return profile.resolvedOwnerId ?? profile.createdById ?? null;
}

export function ProspectSettings({
  profile: initialProfile,
  assignableUsers,
  assignableTeams,
  canReassignOwnership,
}: ProspectSettingsProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (deleteConfirmText !== profile.name || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteProspectProfile(profile.id);
      if (result.success) {
        // The prospect this page renders is gone - leave before a refetch
        // renders a 404 shell. Overview is the prospects list.
        router.push("/dashboard");
      } else {
        setDeleteError(result.error);
        setIsDeleting(false);
      }
    } catch {
      setDeleteError("Failed to delete prospect");
      setIsDeleting(false);
    }
  }

  // Bumped on save failure to force a fresh UnsavedChangesBar instance (key) instead of an incorrect stale "saved" state.
  const [barGen, setBarGen] = useState(0);

  // Form state
  const [name, setName] = useState(profile.name);
  const [companyUrl, setCompanyUrl] = useState(profile.companyUrl || "");
  const [theme, setTheme] = useState<AppearanceTheme>(initialTheme(profile));
  const [branding, setBranding] = useState<AppearanceBranding>({
    logo: profile.prospect.logoUrl || "",
  });

  // Ownership - staged like every other field: selecting a new owner/team
  // only updates local state; the write happens on Save (behind a
  // confirmation dialog, since it reshapes prospect visibility).
  const [pendingOwnerId, setPendingOwnerId] = useState<string | null>(
    currentOwnerId(profile),
  );
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(
    profile.teamId ?? null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  // AI import affects the logo, so it lives in Basic Info, not Brand Theme.
  const aiImportConfig: AppearanceConfig = { theme, branding };
  function handleAiImport(newConfig: AppearanceConfig | null) {
    if (!newConfig) return;
    if (newConfig.theme) setTheme({ ...theme, ...newConfig.theme });
    if (newConfig.branding) setBranding({ ...branding, ...newConfig.branding });
  }

  const ownerChanged = pendingOwnerId !== currentOwnerId(profile);
  const teamChanged = pendingTeamId !== (profile.teamId ?? null);

  // Dirty state drives the Save/Reset bar - compare live form to the saved
  // profile snapshot.
  const baseline = JSON.stringify({
    name: profile.name,
    companyUrl: profile.companyUrl || "",
    theme: initialTheme(profile),
    branding: { logo: profile.prospect.logoUrl || "" },
  });
  const current = JSON.stringify({ name, companyUrl, theme, branding });
  const basicOrThemeChanged = current !== baseline;
  const hasChanges = basicOrThemeChanged || ownerChanged || teamChanged;

  function handleReset() {
    setName(profile.name);
    setCompanyUrl(profile.companyUrl || "");
    setTheme(initialTheme(profile));
    setBranding({ logo: profile.prospect.logoUrl || "" });
    setPendingOwnerId(currentOwnerId(profile));
    setPendingTeamId(profile.teamId ?? null);
  }

  /** Save button handler - routes ownership changes through a confirmation dialog first. */
  function handleSave() {
    if (!name.trim()) {
      toastError("Name is required");
      return;
    }
    if (ownerChanged || teamChanged) {
      setConfirmOpen(true);
      return;
    }
    void performSave();
  }

  /** Surfaces a save failure and resets the bar to its idle unsaved state. */
  function failSave(message: string) {
    toastError(message);
    setBarGen((n) => n + 1);
  }

  /** Actual persistence: basic info/theme, then owner, then team. */
  async function performSave() {
    setIsSaving(true);

    try {
      let latest = profile;

      if (basicOrThemeChanged) {
        const fullTheme: ProspectTheme = {
          primaryColor: theme.primaryColor || DEFAULT_APPEARANCE_THEME.primaryColor,
          primaryHoverColor: theme.primaryHoverColor,
          accentColor: theme.accentColor,
          pageBackground: theme.pageBackground,
          background: theme.background,
          foreground: theme.foreground,
          mutedTextColor: theme.mutedTextColor,
          borderColor: theme.borderColor,
          rowBackground: theme.rowBackground,
          rowHoverBackground: theme.rowHoverBackground,
          gradientFrom: theme.gradientFrom,
          gradientTo: theme.gradientTo,
          borderRadius: theme.borderRadius,
        };

        const result = await updateProspectProfile(profile.id, {
          name: name.trim(),
          // null, not undefined: the mapper treats undefined as "field not
          // submitted" and leaves the stored value alone, so clearing the
          // field used to report success and change nothing.
          companyUrl: companyUrl.trim() || null,
          prospect: {
            logo: branding.logo ? "custom" : "dynamic",
            logoUrl: branding.logo || undefined,
            primaryColor: theme.primaryColor || DEFAULT_APPEARANCE_THEME.primaryColor,
            accentColor: theme.accentColor,
            borderRadius: theme.borderRadius,
            theme: fullTheme,
          },
        });

        if (!result.success) {
          failSave(result.error || "Failed to save profile");
          return;
        }
        latest = result.data;
      }

      if (ownerChanged && pendingOwnerId) {
        const result = await reassignProspectOwner(profile.id, pendingOwnerId);
        if (!result.success) {
          failSave(result.error || "Failed to reassign owner");
          return;
        }
        latest = result.data;
      }

      if (teamChanged) {
        const result = await reassignProspectTeam(profile.id, pendingTeamId);
        if (!result.success) {
          failSave(result.error || "Failed to reassign team");
          return;
        }
        latest = result.data;
      }

      setProfile(latest);
      setPendingOwnerId(currentOwnerId(latest));
      setPendingTeamId(latest.teamId ?? null);
    } catch (err) {
      failSave("Failed to save changes");
      console.error(err);
    } finally {
      setIsSaving(false);
      setConfirmOpen(false);
    }
  }

  const ownerLabel = pendingOwnerId
    ? (assignableUsers.find((u) => u.id === pendingOwnerId)
        ? personLabel(assignableUsers.find((u) => u.id === pendingOwnerId)!)
        : "the selected owner")
    : "the selected owner";
  const teamLabel = pendingTeamId
    ? (assignableTeams.find((t) => t.id === pendingTeamId)?.name ?? "the selected team")
    : NO_TEAM_LABEL;

  const confirmDescription = (() => {
    if (ownerChanged && teamChanged) {
      return `Reassign this prospect's owner to ${ownerLabel} and move it to ${teamLabel}? This changes who can see and edit it.`;
    }
    if (ownerChanged) {
      return `Reassign this prospect's owner to ${ownerLabel}? This changes who can see and edit it.`;
    }
    return pendingTeamId
      ? `Move this prospect to ${teamLabel}? This changes who can see and edit it.`
      : "Remove this prospect from its team? This changes who can see and edit it.";
  })();

  return (
    <div>
      <SettingsSection
        title="Basic Info"
        description="The prospect's display name, company website, and logo."
      >
        <div className={cn(SECTION_CARD, "space-y-4")}>
          <Field label="Prospect Name *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp Demo"
              {...suppressAutofill}
            />
          </Field>
          <Field label="Company Website">
            <Input
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              placeholder="https://acme.com"
              {...suppressAutofill}
            />
          </Field>
          <AiStyleImport
            config={aiImportConfig as never}
            setConfig={(fn) => {
              const result =
                typeof fn === "function" ? fn(aiImportConfig as never) : fn;
              handleAiImport(result as AppearanceConfig);
            }}
            setToast={(message, ok) => {
              if (!message) return;
              // A failed import used to surface as a success toast, which read
              // as "it ran and changed nothing".
              if (ok === false) toastError(message);
              else toastSuccess(message);
            }}
            companyUrl={companyUrl || undefined}
          />
          <LogoField
            value={branding.logo || ""}
            onChange={(logo) => setBranding({ ...branding, logo })}
            setToast={(message) => {
              if (message) toastSuccess(message);
            }}
            previewBackground={
              theme.pageBackground || DEFAULT_APPEARANCE_THEME.pageBackground
            }
            websiteUrl={companyUrl || undefined}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Brand Theme"
        description={`Colors shared across all of ${profile.name}'s demos. Editing it updates every demo link for this prospect at once.`}
      >
        <div className={SECTION_CARD}>
          <AppearanceForm
            theme={theme}
            branding={branding}
            onThemeChange={setTheme}
            onBrandingChange={setBranding}
            setToast={(message) => {
              if (message) toastSuccess(message);
            }}
            simplified={true}
            hideLogo={true}
            hideShowPoweredBy={true}
            hideAiImport={true}
            companyUrl={companyUrl || undefined}
            bare
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Ownership"
        description="Who owns this prospect and which team it belongs to. These drive who can see and edit it."
      >
        <div className={cn(SECTION_CARD, "space-y-5")}>
          <Field label="Owner">
            <PersonPicker
              candidates={assignableUsers}
              value={pendingOwnerId}
              onSelect={setPendingOwnerId}
              disabled={!canReassignOwnership || isSaving}
            />
          </Field>
          <Field label="Team">
            <TeamPicker
              candidates={assignableTeams}
              value={pendingTeamId}
              onSelect={setPendingTeamId}
              disabled={!canReassignOwnership || isSaving}
            />
          </Field>
          {!canReassignOwnership && (
            <p className="text-xs text-muted-foreground">
              Only the current owner or an admin can reassign this prospect.
            </p>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Danger zone"
        description="Deleting a prospect also deletes its demos. This cannot be undone."
      >
        <div className={cn(SECTION_CARD, "space-y-4")}>
          {!confirmingDelete ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Permanently delete <span className="font-medium text-foreground">{profile.name}</span>,
                its demo configs and its share links. Sessions already recorded
                against it are not removed.
              </p>
              <Button
                variant="outline"
                onClick={() => setConfirmingDelete(true)}
                disabled={isDeleting}
                className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                Type <span className="font-medium">{profile.name}</span> to confirm.
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={profile.name}
                aria-label={`Type ${profile.name} to confirm deletion`}
                autoFocus
              />
              {deleteError && (
                <p className="text-sm text-destructive">{deleteError}</p>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  // Exact match required: this removes the demos too, so a
                  // stray click must not be enough.
                  disabled={deleteConfirmText !== profile.name || isDeleting}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  {isDeleting ? "Deleting..." : "Delete permanently"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteConfirmText("");
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      <UnsavedChangesBar
        key={barGen}
        hasChanges={hasChanges}
        onSave={handleSave}
        onReset={handleReset}
        suppressed={isSaving}
      />
      {isSaving && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-zinc-900 py-1.5 pl-3 pr-4 shadow-[var(--shadow-elevated)] dark:bg-[oklch(0.940_0.008_231)]"
        >
          <Spinner className="h-4 w-4 text-white dark:text-zinc-800" />
          <span className="text-[13px] font-medium text-white dark:text-zinc-800">
            Saving...
          </span>
        </div>
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!isSaving) setConfirmOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm ownership change</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              loading={isSaving}
              disabled={isSaving}
              onClick={() => void performSave()}
            >
              {isSaving ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Estimated dropdown panel height (search row + max-h-56 list + borders). */
const PICKER_PANEL_HEIGHT = 300;

/** True when the panel should open upward to avoid clipping below the trigger. */
function useOpenUpward(open: boolean, containerRef: RefObject<HTMLDivElement | null>) {
  const [openUpward, setOpenUpward] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;
    function measure() {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < PICKER_PANEL_HEIGHT && rect.top > spaceBelow);
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, containerRef]);

  return openUpward;
}

interface PersonPickerProps {
  candidates: AdminUserView[];
  value: string | null;
  onSelect: (userId: string) => void;
  disabled?: boolean;
}

/**
 * Searchable owner combobox - inline, non-portaled panel (matches the teams
 * admin UserPicker) so it carries the operator theme correctly in dark mode
 * without a second, un-themed portal root. Selecting a candidate only stages
 * the pick (parent state) - the write happens on Save, behind confirmation.
 */
function PersonPicker({
  candidates,
  value,
  onSelect,
  disabled,
}: PersonPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const openUpward = useOpenUpward(open, containerRef);
  const selected = candidates.find((u) => u.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q),
    );
  }, [candidates, query]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) close();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const isDisabled = disabled || candidates.length === 0;

  return (
    <div ref={containerRef} className="relative w-full sm:w-72">
      <button
        type="button"
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Select prospect owner"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={isDisabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">
          {selected ? personLabel(selected) : "Select an owner"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute left-0 z-20 w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-elevated)]",
            openUpward ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          <div className="border-b border-border-divider p-2">
            <Input
              placeholder="Search by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8"
              autoFocus
              {...suppressAutofill}
            />
          </div>
          <div className={cn("max-h-56 overflow-y-auto p-1", THIN_SCROLLBAR)}>
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                No users match.
              </p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  role="option"
                  aria-selected={u.id === value}
                  onClick={() => {
                    onSelect(u.id);
                    close();
                  }}
                  className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent/50"
                >
                  <span className="truncate font-medium text-foreground">
                    {personLabel(u)}
                  </span>
                  {u.displayName && (
                    <span className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TeamPickerProps {
  candidates: Team[];
  value: string | null;
  onSelect: (teamId: string | null) => void;
  disabled?: boolean;
}

const NO_TEAM_LABEL = "No team";

/**
 * Searchable team combobox, plus a synthetic "No team" row that clears it.
 * Selecting an option only stages the pick - the write happens on Save.
 */
function TeamPicker({
  candidates,
  value,
  onSelect,
  disabled,
}: TeamPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const openUpward = useOpenUpward(open, containerRef);
  const selected = candidates.find((t) => t.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((t) => t.name.toLowerCase().includes(q));
  }, [candidates, query]);

  const showNoTeam =
    query.trim().length === 0 ||
    NO_TEAM_LABEL.toLowerCase().includes(query.trim().toLowerCase());

  function close() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) close();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const isDisabled = disabled;

  return (
    <div ref={containerRef} className="relative w-full sm:w-72">
      <button
        type="button"
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Select prospect team"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={isDisabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{selected ? selected.name : NO_TEAM_LABEL}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute left-0 z-20 w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-elevated)]",
            openUpward ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          <div className="border-b border-border-divider p-2">
            <Input
              placeholder="Search teams"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8"
              autoFocus
              {...suppressAutofill}
            />
          </div>
          <div className={cn("max-h-56 overflow-y-auto p-1", THIN_SCROLLBAR)}>
            {showNoTeam && (
              <button
                type="button"
                role="option"
                aria-selected={value === null}
                onClick={() => {
                  onSelect(null);
                  close();
                }}
                className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground outline-none transition-colors hover:bg-accent/50"
              >
                {NO_TEAM_LABEL}
              </button>
            )}
            {filtered.length === 0 && !showNoTeam ? (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                No teams match.
              </p>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={t.id === value}
                  onClick={() => {
                    onSelect(t.id);
                    close();
                  }}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-foreground outline-none transition-colors hover:bg-accent/50"
                >
                  {t.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
