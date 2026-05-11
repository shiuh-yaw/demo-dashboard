"use client";

/**
 * Client-side Earns Dashboard Component
 *
 * Handles all client-side interactions: delete modal, toast notifications,
 * and navigation. Receives initial data from the server component.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Settings, Trash2, ExternalLink, Banknote } from "lucide-react";
import type { StoredEarnConfig } from "@/lib/types/dashboard";
import { deleteEarnConfig } from "@/lib/actions/earns";
import { Button } from "@dynamic-demos/ui";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Toast } from "@/app/checkouts/components/editor/toast";
import { env } from "@/env";

// URL to the Earn demo app
const EARN_PROJECT_URL = env.NEXT_PUBLIC_EARN_PROJECT_URL;

interface EarnsClientProps {
  initialConfigs: StoredEarnConfig[];
  orphanedConfigs: StoredEarnConfig[];
  currentUserId?: string;
}

export function EarnsClient({
  initialConfigs,
  orphanedConfigs: initialOrphaned,
  currentUserId,
}: EarnsClientProps) {
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

  // Get filtered configs based on current filter
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
    router.push("/earns/new");
  }

  async function handleDelete() {
    if (!showDeleteModal || isDeleting) return;

    try {
      setIsDeleting(true);
      const result = await deleteEarnConfig(showDeleteModal.id);

      if (result.success) {
        setConfigs((prev) => prev.filter((c) => c.id !== showDeleteModal.id));
        setOrphanedConfigs((prev) =>
          prev.filter((c) => c.id !== showDeleteModal.id),
        );
        setToast("Earn config deleted");
        setShowDeleteModal(null);
      } else {
        setToast(result.error || "Failed to delete config");
      }
    } catch (err) {
      setToast("Failed to delete config");
      console.error("Failed to delete config:", err);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Earn</h1>
        <div className="flex items-center gap-2">
          {/* Filter Toggle - Only show if there are unclaimed configs */}
          {orphanedConfigs.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setFilter("my")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  filter === "my"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                My
              </button>
              <button
                onClick={() => setFilter("unclaimed")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  filter === "unclaimed"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Unclaimed
              </button>
            </div>
          )}
          <Button
            onClick={handleCreate}
            className="gap-1.5 bg-[#4779FF] hover:bg-[#3968e8] text-white text-xs"
          >
            <Plus className="w-4 h-4" />
            New Config
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {displayedConfigs.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Banknote className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
            No Earn configs yet
          </h3>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            Create your first Earn config to customize the theme and branding.
          </p>
          <div className="flex justify-center">
            <Button
              onClick={handleCreate}
              className="gap-1.5 bg-[#4779FF] hover:bg-[#3968e8] text-white text-xs"
            >
              <Plus className="w-4 h-4" />
              Create Config
            </Button>
          </div>
        </div>
      )}

      {/* Configs Table */}
      {displayedConfigs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_100px_100px] border-b border-slate-100 bg-slate-50">
            <div className="px-4 py-2.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                Name
              </span>
            </div>
            <div className="px-4 py-2.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                Updated
              </span>
            </div>
            <div className="px-4 py-2.5 text-right">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                Actions
              </span>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-100">
            {displayedConfigs.map((config) => (
              <div
                key={config.id}
                className="grid grid-cols-[1fr_100px_100px] hover:bg-slate-50 transition-colors cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/earns/${config.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/earns/${config.id}`);
                  }
                }}
              >
                {/* Name */}
                <div className="px-4 py-3 flex items-center">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">
                      {config.name}
                    </p>
                    {config.description && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {config.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Updated */}
                <div className="px-4 py-3 flex items-center">
                  <span className="text-xs text-slate-500">
                    {new Date(config.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 flex items-center justify-end gap-0.5">
                  <Link
                    href={`/earns/${config.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                    title="Edit"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Link>
                  <a
                    href={`${EARN_PROJECT_URL}/?theme=${config.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                    title="Open Demo"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowDeleteModal({
                        id: config.id,
                        name: config.name,
                      });
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
        title="Delete Earn Config"
        description={
          <>
            Are you sure you want to delete{" "}
            <span className="font-medium text-slate-900">
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
