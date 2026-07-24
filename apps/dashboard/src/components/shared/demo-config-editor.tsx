"use client";

/**
 * Unified demo-config editor. One shell owns the common fields (name,
 * prospect binding, appearance via AppearanceForm) and delegates kind-specific
 * fields to the registry's KindFields, saving through the existing
 * `update{Kind}Config` action. No live-widget preview panel - the form only.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/droplet-client";
import { Input } from "@dynamic-demos/ui";
import { Toast } from "@/app/(operator)/checkouts/components/editor/toast";
import {
  Section,
  Field,
} from "@/app/(operator)/checkouts/components/editor/form-components";
import {
  AppearanceForm,
  DEFAULT_APPEARANCE_THEME,
  type AppearanceTheme,
  type AppearanceBranding,
} from "@/components/shared/appearance-form";
import { ProspectPicker } from "@/components/shared/prospect-picker";
import type { ProspectOption } from "@/lib/actions/prospects";
import {
  applyProspectTheme,
  prospectOptionThemeToAppearance,
} from "@/lib/prospect-theme-merge";
import { demoThemeUrl } from "@/lib/share-links/launch-url";
import { deleteProspectDemo } from "@/lib/actions/prospects";
import { toastError } from "@/lib/toast";
import { SaveBar } from "@/components/shared/save-bar";
import { DemoInstanceHeader } from "@/components/shared/demo-instance-header";
import { type ShareLinkBoundProspect } from "@/components/shared/share-link-button";
import type { DemoConfigKind } from "@/lib/services/types";
import {
  getDemoEditorEntry,
  type KindState,
  type StoredDemoConfig,
} from "@/components/shared/demo-editor-registry";

const DEFAULT_LOGO = { logo: "" };

// Kinds deletable from the prospect-instance danger zone; kinds absent here
// (trade, visa-direct, flow) are not offered a delete action from here.
const DELETABLE_KIND: Partial<
  Record<DemoConfigKind, "earn" | "checkout" | "wallet" | "remittance">
> = {
  wallet: "wallet",
  earn: "earn",
  remittance: "remittance",
  checkout: "checkout",
};

interface DemoConfigEditorProps {
  kind: DemoConfigKind;
  config: StoredDemoConfig;
  /** Back link target; defaults to the kind's standalone list route. */
  backHref?: string;
  /** Hidden in-context (the prospect binding is implied by the route). */
  showProspectPicker?: boolean;
  /**
   * "prospect-instance" swaps the header + top Save button for a compact
   * name/actions row, an Insights | Theme sub-toggle, and a bottom SaveBar on
   * the Theme tab; hides all branding fields; renames the Appearance section
   * to Theme; and widens the Theme form (no max-w clamp, wider Colors grid).
   * Default "standalone" keeps the 5 kind-editor routes
   * (wallets/earns/remittance/trade/visa-direct) unchanged.
   */
  variant?: "standalone" | "prospect-instance";
  /** Rendered between the header and the form body - metrics/sessions content for "prospect-instance"; unused by standalone callers. */
  children?: React.ReactNode;
  /** Bound prospect for the header's Share action (prospect-instance only). */
  instanceShare?: ShareLinkBoundProspect;
}

export function DemoConfigEditor({
  kind,
  config,
  backHref,
  showProspectPicker = true,
  variant = "standalone",
  children,
  instanceShare,
}: DemoConfigEditorProps) {
  const entry = getDemoEditorEntry(kind);
  const isProspectInstance = variant === "prospect-instance";
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** Insights | Theme sub-toggle (prospect-instance only). */
  const [activeTab, setActiveTab] = useState<"insights" | "theme">("insights");

  const [name, setName] = useState(config.name);
  const [prospectId, setProspectId] = useState<string | null>(
    config.prospectId ?? null,
  );

  const initialAppearance = useMemo(
    () => entry.initAppearance?.(config) ?? { theme: {}, branding: {} },
    // config identity is stable for the editor's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const initialKindState = useMemo(
    () => entry.initKindState?.(config) ?? {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [theme, setTheme] = useState<AppearanceTheme>(initialAppearance.theme);
  const [branding, setBranding] = useState<AppearanceBranding>(
    initialAppearance.branding,
  );
  const [kindState, setKindState] = useState<KindState>(initialKindState);

  // SaveBar state (prospect-instance only): a snapshot of the last persisted
  // values drives the dirty check, independent of `config` (which only
  // updates on a server round-trip). SaveBar derives its own idle/saving/saved
  // animation from `isSavingBar` + `hasBarChanges`, so a failed save just
  // stays dirty - no manual reset needed.
  const [savedSnapshot, setSavedSnapshot] = useState({
    name: config.name,
    theme: initialAppearance.theme,
    branding: initialAppearance.branding,
    kindState: initialKindState,
  });
  const [isSavingBar, setIsSavingBar] = useState(false);
  const [barError, setBarError] = useState<string | null>(null);
  const hasBarChanges =
    JSON.stringify({ name, theme, branding, kindState }) !==
    JSON.stringify(savedSnapshot);

  // A fresh edit after a failed save clears the bar's error so it can morph
  // back to idle/saving instead of pinning a stale failure message.
  useEffect(() => {
    if (barError) setBarError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, theme, branding, kindState]);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const demoUrl = demoThemeUrl(kind, config.id);
  const resolvedBack = backHref ?? entry.backHref;
  const KindFields = entry.KindFields;
  const showKindFields =
    KindFields && !(isProspectInstance && entry.hideKindFieldsInInstance);
  // Delete lives in the instance danger zone only, and only for a deletable
  // prospect demo kind with a resolvable prospect binding.
  const deleteType = DELETABLE_KIND[kind];
  const deleteProspectId = config.prospectId ?? instanceShare?.id ?? null;
  const canDelete = isProspectInstance && Boolean(deleteType && deleteProspectId);

  async function handleDelete() {
    if (!deleteType || !deleteProspectId) return;
    setIsDeleting(true);
    try {
      const result = await deleteProspectDemo(deleteProspectId, deleteType);
      if (result.success) {
        setConfirmDeleteOpen(false);
        router.push(resolvedBack);
      } else {
        toastError(result.error || "Failed to delete demo");
        setIsDeleting(false);
      }
    } catch (err) {
      toastError("Failed to delete demo");
      console.error(err);
      setIsDeleting(false);
    }
  }

  // Prospect prefill (wallet): a real selection prefills the palette + logo.
  function handleProspectSelect(option: ProspectOption | null) {
    if (!option || !entry.prospectPrefill) return;
    const incoming = prospectOptionThemeToAppearance(option.theme);
    setTheme((current) =>
      applyProspectTheme(current, DEFAULT_APPEARANCE_THEME, incoming),
    );
    setBranding((current) =>
      applyProspectTheme(current, DEFAULT_LOGO, {
        logo: option.theme.logoUrl ?? undefined,
      }),
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      setToast("Name is required");
      return;
    }
    if (!entry.save) {
      setToast("This demo is edited elsewhere");
      return;
    }
    setIsSaving(true);
    try {
      const result = await entry.save(config.id, {
        name: name.trim(),
        appearance: { theme, branding },
        kindState,
        prospectId,
        original: config,
      });
      if (result.success) {
        setToast("Config saved");
        router.refresh();
      } else {
        setToast(result.error || "Failed to save config");
      }
    } catch (err) {
      setToast("Failed to save config");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  /** SaveBar save (prospect-instance only) - the bar owns the save affordance, so failures surface inline in the bar (`barError`), never a toast. */
  async function handleBarSave() {
    setBarError(null);
    if (!name.trim()) {
      setBarError("Name is required");
      return;
    }
    if (!entry.save) {
      setBarError("This demo is edited elsewhere");
      return;
    }
    setIsSavingBar(true);
    try {
      const result = await entry.save(config.id, {
        name: name.trim(),
        appearance: { theme, branding },
        kindState,
        prospectId,
        original: config,
      });
      if (result.success) {
        // Normalize the input to the trimmed value we persisted so the dirty
        // check clears - otherwise a trailing space keeps the bar "dirty".
        setName(name.trim());
        setSavedSnapshot({ name: name.trim(), theme, branding, kindState });
        router.refresh();
      } else {
        setBarError(result.error || "Failed to save config");
      }
    } catch (err) {
      setBarError("Failed to save config");
      console.error(err);
    } finally {
      setIsSavingBar(false);
    }
  }

  function handleBarReset() {
    setBarError(null);
    setName(savedSnapshot.name);
    setTheme(savedSnapshot.theme);
    setBranding(savedSnapshot.branding);
    setKindState(savedSnapshot.kindState);
  }

  // Shared form body (Basic Info + Theme/Appearance + kind-specific fields) -
  // both variants render the same fields, only the outer wrapper width and
  // AppearanceForm's title/visibility props differ.
  const formBody = (
    <>
      <Section title="Basic Info">
        <Field label="Name *">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Config"
            className="dark:bg-background dark:text-foreground dark:border-border dark:placeholder:text-muted-foreground"
          />
        </Field>
        {showProspectPicker && (
          <Field label="Prospect">
            <ProspectPicker
              value={prospectId}
              onChange={setProspectId}
              onSelectOption={
                entry.prospectPrefill ? handleProspectSelect : undefined
              }
            />
          </Field>
        )}
      </Section>

      {entry.appearanceMode !== "none" && (
        <AppearanceForm
          theme={theme}
          branding={branding}
          onThemeChange={setTheme}
          onBrandingChange={setBranding}
          setToast={setToast}
          simplified={entry.appearanceMode === "simplified"}
          hideShowPoweredBy={isProspectInstance ? true : entry.hideShowPoweredBy}
          hideLogo={isProspectInstance ? true : entry.hideLogo}
          hideAccent={entry.hideAccent}
          hideAiImport={isProspectInstance ? true : undefined}
          title={isProspectInstance ? "Theme" : undefined}
          description={
            isProspectInstance
              ? "Overrides the prospect's theme for this demo."
              : undefined
          }
          wide={isProspectInstance}
        />
      )}

      {showKindFields && KindFields && (
        <KindFields
          state={kindState}
          setState={setKindState}
          setToast={setToast}
        />
      )}
    </>
  );

  return (
    <div>
      {isProspectInstance ? (
        <DemoInstanceHeader
          name={name}
          backHref={resolvedBack}
          demoUrl={demoUrl || null}
          demoConfigId={config.id}
          instanceShare={instanceShare}
        />
      ) : (
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link href={resolvedBack} aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="truncate text-xl font-semibold text-foreground">
              {name}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {demoUrl && (
              <Button asChild variant="secondary" size="sm">
                <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open Demo
                </a>
              </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      {isProspectInstance && (
        <div
          role="tablist"
          aria-label="Demo instance view"
          className="mb-6 inline-flex items-center gap-1 rounded-lg bg-muted/60 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "insights"}
            onClick={() => setActiveTab("insights")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "insights"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Insights
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "theme"}
            onClick={() => setActiveTab("theme")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "theme"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Theme
          </button>
        </div>
      )}

      {isProspectInstance ? (
        <>
          {activeTab === "insights" && children && (
            <div className="space-y-8">{children}</div>
          )}
          {activeTab === "theme" && (
            <div className="space-y-5">
              {formBody}
              {canDelete && (
                <section className="mt-8 rounded-xl border border-red-200 bg-red-50/40 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">
                        Delete demo
                      </h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Removes this demo and its share links for the prospect.
                        This cannot be undone.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDeleteOpen(true)}
                      className="shrink-0 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete demo
                    </Button>
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {children && <div className="mb-8 space-y-8">{children}</div>}
          <div className="max-w-xl space-y-5">{formBody}</div>
        </>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {isProspectInstance && activeTab === "theme" && (
        <SaveBar
          dirty={hasBarChanges}
          saving={isSavingBar}
          error={barError}
          onSave={handleBarSave}
          onReset={handleBarReset}
        />
      )}

      {canDelete && (
        <Dialog
          open={confirmDeleteOpen}
          onOpenChange={(open) => {
            if (!isDeleting) setConfirmDeleteOpen(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this demo?</DialogTitle>
              <DialogDescription>
                This removes {name} and any share links for this prospect. This
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" size="sm" disabled={isDeleting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete demo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
