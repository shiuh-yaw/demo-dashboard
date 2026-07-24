"use client";

/**
 * Generic demo-kind list client: the one seam shared by every demo-kind list
 * page (wallets/earns/checkouts/remittance/trade/visa-direct). Per kind, the
 * registry (`demo-kind-list-registry.tsx`) declares copy, route, icon, and
 * the delete action; this component owns the shared filter/delete/toast
 * behavior and the semantic-token markup so every kind renders correctly in
 * both light and dark mode.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Settings, Trash2, ExternalLink } from "lucide-react";
import type { ComponentType } from "react";
import { ICON_ACTION } from "@/components/shared/icon-action";
import { Button, Tooltip } from "@dynamic-demos/ui";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Toast } from "@/app/(operator)/checkouts/components/editor/toast";
import { ProspectIcon } from "@/components/shared/prospect-icon";
import { ShareLinkButton } from "@/components/shared/share-link-button";
import { demoThemeUrl } from "@/lib/share-links/launch-url";
import type { DemoConfigKind } from "@/lib/services/types";

export interface DemoKindListItem {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
  ownerId?: string;
  prospectId?: string | null;
  prospectName?: string | null;
  prospectDomain?: string | null;
}

export interface DemoKindListExtraColumn<T extends DemoKindListItem> {
  header: string;
  render: (item: T) => React.ReactNode;
}

export interface DemoKindListConfig<T extends DemoKindListItem> {
  /** Registry key; also the `demoThemeUrl` kind. */
  kind: DemoConfigKind;
  pageTitle: string;
  /** Route segment, e.g. "/wallets" - drives create/edit/open navigation. */
  routeBase: string;
  icon: ComponentType<{ className?: string }>;
  newButtonLabel: string;
  createButtonLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  deleteModalTitle: string;
  deleteSuccessMessage: string;
  deleteFailureMessage: string;
  deleteAction: (id: string) => Promise<{ success: boolean; error?: string }>;
  /** Icon box rendered before the name (checkouts' per-row mode icon). */
  renderNameIcon?: (item: T) => React.ReactNode;
  /** Extra column between Name and Updated (checkouts' Mode badge). */
  extraColumn?: DemoKindListExtraColumn<T>;
}

export interface DemoKindListClientProps<T extends DemoKindListItem> {
  config: DemoKindListConfig<T>;
  initialConfigs: T[];
  orphanedConfigs: T[];
  currentUserId?: string;
}

export function DemoKindListClient<T extends DemoKindListItem>({
  config,
  initialConfigs,
  orphanedConfigs: initialOrphaned,
  currentUserId,
}: DemoKindListClientProps<T>) {
  const router = useRouter();
  const [configs, setConfigs] = useState(initialConfigs);
  const [orphanedConfigs, setOrphanedConfigs] = useState(initialOrphaned);
  const [filter, setFilter] = useState<"my" | "unclaimed">("my");
  const [showDeleteModal, setShowDeleteModal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const displayedConfigs =
    filter === "my"
      ? configs.filter(
          (c) => c.ownerId && currentUserId && c.ownerId === currentUserId,
        )
      : orphanedConfigs
          .filter((c) => !c.ownerId)
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );

  function handleCreate() {
    router.push(`${config.routeBase}/new`);
  }

  async function handleDelete() {
    if (!showDeleteModal || isDeleting) return;

    try {
      setIsDeleting(true);
      const result = await config.deleteAction(showDeleteModal.id);

      if (result.success) {
        setConfigs((prev) => prev.filter((c) => c.id !== showDeleteModal.id));
        setOrphanedConfigs((prev) =>
          prev.filter((c) => c.id !== showDeleteModal.id),
        );
        setToast(config.deleteSuccessMessage);
        setShowDeleteModal(null);
      } else {
        setToast(result.error || config.deleteFailureMessage);
      }
    } catch (err) {
      setToast(config.deleteFailureMessage);
      console.error(`Failed to delete ${config.kind} config:`, err);
    } finally {
      setIsDeleting(false);
    }
  }

  const Icon = config.icon;
  const gridCols = config.extraColumn
    ? "grid-cols-[1fr_80px_100px_100px]"
    : "grid-cols-[1fr_100px_100px]";

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground">
          {config.pageTitle}
        </h1>
        <div className="flex items-center gap-2">
          {/* Filter Toggle - Only show if there are unclaimed configs */}
          {orphanedConfigs.length > 0 && (
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setFilter("my")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  filter === "my"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                My
              </button>
              <button
                onClick={() => setFilter("unclaimed")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  filter === "unclaimed"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Unclaimed
              </button>
            </div>
          )}
          <Button
            onClick={handleCreate}
            className="gap-1.5 bg-action hover:brightness-110 text-white text-xs"
          >
            <Plus className="w-4 h-4" />
            {config.newButtonLabel}
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {displayedConfigs.length === 0 && (
        <div className="bg-card rounded-xl border border-border-divider p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Icon className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5">
            {config.emptyTitle}
          </h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
            {config.emptyDescription}
          </p>
          <div className="flex justify-center">
            <Button
              onClick={handleCreate}
              className="gap-1.5 bg-action hover:brightness-110 text-white text-xs"
            >
              <Plus className="w-4 h-4" />
              {config.createButtonLabel}
            </Button>
          </div>
        </div>
      )}

      {/* Configs Table */}
      {displayedConfigs.length > 0 && (
        <div className="bg-card rounded-xl border border-border-divider overflow-hidden">
          {/* Table Header */}
          <div
            className={`grid ${gridCols} border-b border-border-divider bg-muted/50`}
          >
            <div className="px-4 py-2.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Name
              </span>
            </div>
            {config.extraColumn && (
              <div className="px-4 py-2.5">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {config.extraColumn.header}
                </span>
              </div>
            )}
            <div className="px-4 py-2.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Updated
              </span>
            </div>
            <div className="px-4 py-2.5 text-right">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Actions
              </span>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border-divider">
            {displayedConfigs.map((item) => (
              <div
                key={item.id}
                className={`grid ${gridCols} hover:bg-muted/50 transition-colors cursor-pointer`}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`${config.routeBase}/${item.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`${config.routeBase}/${item.id}`);
                  }
                }}
              >
                {/* Name */}
                <div className="px-4 py-3 flex items-center gap-2.5">
                  {config.renderNameIcon?.(item)}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.description}
                      </p>
                    )}
                    {item.prospectName && (
                      <div className="flex items-center gap-1 mt-0.5 min-w-0">
                        <ProspectIcon
                          domain={item.prospectDomain}
                          name={item.prospectName}
                          size={14}
                        />
                        <span className="text-[11px] text-muted-foreground truncate">
                          {item.prospectName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Extra column (checkouts' Mode badge) */}
                {config.extraColumn && (
                  <div className="px-4 py-3 flex items-center">
                    {config.extraColumn.render(item)}
                  </div>
                )}

                {/* Updated */}
                <div className="px-4 py-3 flex items-center">
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 flex items-center justify-end gap-0.5">
                  <Tooltip content="Edit" position="top">
                    <Link
                      href={`${config.routeBase}/${item.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className={ICON_ACTION}
                      aria-label="Edit"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </Link>
                  </Tooltip>
                  <Tooltip content="Open Demo" position="top">
                    <a
                      href={demoThemeUrl(config.kind, item.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className={ICON_ACTION}
                      aria-label="Open Demo"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </Tooltip>
                  <ShareLinkButton
                    demoConfigId={item.id}
                    boundProspect={
                      item.prospectId && item.prospectName
                        ? {
                            id: item.prospectId,
                            name: item.prospectName,
                            domain: item.prospectDomain,
                          }
                        : null
                    }
                  />
                  <Tooltip content="Delete" position="top">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowDeleteModal({
                          id: item.id,
                          name: item.name,
                        });
                      }}
                      className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/40 rounded-md transition-colors cursor-pointer"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        onConfirm={handleDelete}
        title={config.deleteModalTitle}
        description={
          <>
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              &quot;{showDeleteModal?.name}&quot;
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmText="Delete"
        isLoading={isDeleting}
        variant="danger"
      />

      {/* Toast Notification */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
