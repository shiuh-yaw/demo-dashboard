"use client";

/**
 * Client-side Checkouts Dashboard Component
 *
 * Handles all client-side interactions: delete modal, toast notifications,
 * and navigation. Receives initial data from the server component.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Settings,
  Trash2,
  ExternalLink,
  ArrowUpDown,
  ArrowDownToLine,
  CreditCard,
} from "lucide-react";
import type { StoredCheckoutConfig } from "@/lib/types/dashboard";
import { deleteCheckout } from "@/lib/actions/checkouts";
import { Button } from "@dynamic-demos/ui";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Toast } from "./editor/toast";
import { env } from "@/env";

const WIDGET_PROJECT_URL = env.NEXT_PUBLIC_WIDGET_PROJECT_URL;

interface CheckoutsClientProps {
  initialCheckouts: StoredCheckoutConfig[];
  orphanedCheckouts: StoredCheckoutConfig[];
  currentUserId?: string;
  currentUserEmail?: string;
}

export function CheckoutsClient({
  initialCheckouts,
  orphanedCheckouts: initialOrphaned,
  currentUserId,
}: CheckoutsClientProps) {
  const router = useRouter();
  const [checkouts, setCheckouts] = useState(initialCheckouts);
  const [orphanedCheckouts, setOrphanedCheckouts] = useState(initialOrphaned);
  const [filter, setFilter] = useState<"my" | "unclaimed">("my");
  const [showDeleteModal, setShowDeleteModal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Get filtered checkouts based on current filter
  const displayedCheckouts =
    filter === "my"
      ? checkouts.filter(
          (c) => c.ownerId && currentUserId && c.ownerId === currentUserId
        )
      : orphanedCheckouts
          .filter((c) => !c.ownerId)
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );

  function handleCreate() {
    router.push("/checkouts/new");
  }

  async function handleDelete() {
    if (!showDeleteModal || isDeleting) return;

    try {
      setIsDeleting(true);
      const result = await deleteCheckout(showDeleteModal.id);

      if (result.success) {
        setCheckouts((prev) => prev.filter((c) => c.id !== showDeleteModal.id));
        setOrphanedCheckouts((prev) =>
          prev.filter((c) => c.id !== showDeleteModal.id)
        );
        setToast("Checkout deleted");
        setShowDeleteModal(null);
      } else {
        setToast(result.error || "Failed to delete checkout");
      }
    } catch (err) {
      setToast("Failed to delete checkout");
      console.error("Failed to delete checkout:", err);
    } finally {
      setIsDeleting(false);
    }
  }

  function getModeIcon(mode?: string) {
    if (mode === "deposit") {
      return <ArrowDownToLine className="w-3.5 h-3.5 text-slate-500" />;
    }
    return <CreditCard className="w-3.5 h-3.5 text-slate-500" />;
  }

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Checkouts</h1>
        <div className="flex items-center gap-2">
          {/* Filter Toggle - Only show if there are unclaimed checkouts */}
          {orphanedCheckouts.length > 0 && (
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
            New Checkout
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {displayedCheckouts.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <ArrowUpDown className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
            No checkouts yet
          </h3>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            Create your first checkout to start accepting payments or deposits.
          </p>
          <div className="flex justify-center">
            <Button
              onClick={handleCreate}
              className="gap-1.5 bg-[#4779FF] hover:bg-[#3968e8] text-white text-xs"
            >
              <Plus className="w-4 h-4" />
              Create Checkout
            </Button>
          </div>
        </div>
      )}

      {/* Checkouts Table */}
      {displayedCheckouts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_80px_100px_100px] border-b border-slate-100 bg-slate-50">
            <div className="px-4 py-2.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                Name
              </span>
            </div>
            <div className="px-4 py-2.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                Mode
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
            {displayedCheckouts.map((config) => (
              <div
                key={config.id}
                className="grid grid-cols-[1fr_80px_100px_100px] hover:bg-slate-50 transition-colors cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/checkouts/${config.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/checkouts/${config.id}`);
                  }
                }}
              >
                {/* Name */}
                <div className="px-4 py-3 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    {getModeIcon(config.mode || config.config.mode)}
                  </div>
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

                {/* Mode */}
                <div className="px-4 py-3 flex items-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium capitalize ${
                      (config.mode || config.config.mode) === "payment"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {config.mode || config.config.mode}
                  </span>
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
                    href={`/checkouts/${config.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                    title="Edit"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Link>
                  <a
                    href={`${WIDGET_PROJECT_URL}/?theme=${config.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                    title="Open Checkout"
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
        title="Delete Checkout"
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
