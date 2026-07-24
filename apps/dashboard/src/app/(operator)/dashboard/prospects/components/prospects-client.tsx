"use client";

/**
 * Client-side Prospects Dashboard Component
 *
 * Handles all client-side interactions: delete modal, toast notifications,
 * and navigation. Receives initial data from the server component.
 */

import { useState } from "react";
import { ICON_ACTION } from "@/components/shared/icon-action";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Settings,
  Trash2,
  Building2,
} from "lucide-react";
import type { ProspectProfile } from "@/lib/types/dashboard";
import type { Page } from "@/lib/services/types";
import type { ProspectScope } from "@/lib/prospect-scope";
import {
  deleteProspectProfile,
  listProspectsPage,
} from "@/lib/actions/prospects";
import { keys } from "@/lib/query/keys";
import { useInfiniteList } from "@/lib/query/use-infinite-list";
import { Button, Tooltip } from "@dynamic-demos/ui";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { NewProspectDialog } from "@/components/shared/new-prospect-dialog";
import { ProspectIcon } from "@/components/shared/prospect-icon";
import { displayHost } from "@/lib/display-host";
import { Toast } from "@/app/(operator)/checkouts/components/editor/toast";

interface ProspectsClientProps {
  /** SSR-seeded first page of the active-scope list; the hook takes it from here with no initial fetch. */
  initialPage: Page<ProspectProfile>;
  /** The scope the server enforced for `initialPage` - keys the query cache and is echoed on every subsequent page fetch. */
  scope: ProspectScope;
  orphanedProfiles: ProspectProfile[];
  currentUserId?: string;
}

export function ProspectsClient({
  initialPage,
  scope,
  orphanedProfiles: initialOrphaned,
  currentUserId,
}: ProspectsClientProps) {
  const router = useRouter();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [orphanedProfiles, setOrphanedProfiles] = useState(initialOrphaned);
  const [filter, setFilter] = useState<"my" | "unclaimed">("my");
  const [showDeleteModal, setShowDeleteModal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { items: profiles, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteList<ProspectProfile>({
      queryKey: keys.prospects.list({ scope }),
      fetchPage: (cursor) => listProspectsPage(scope, cursor),
      initialPage,
    });

  // Get filtered profiles based on current filter
  const displayedProfiles =
    filter === "my"
      ? profiles.filter(
          (p) =>
            !deletedIds.has(p.id) &&
            p.ownerId &&
            currentUserId &&
            p.ownerId === currentUserId
        )
      : orphanedProfiles
          .filter((p) => !p.ownerId)
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );

  function handleCreate() {
    setCreateOpen(true);
  }

  async function handleDelete() {
    if (!showDeleteModal || isDeleting) return;

    try {
      setIsDeleting(true);
      const result = await deleteProspectProfile(showDeleteModal.id);

      if (result.success) {
        setDeletedIds((prev) => new Set(prev).add(showDeleteModal.id));
        setOrphanedProfiles((prev) =>
          prev.filter((p) => p.id !== showDeleteModal.id)
        );
        setToast("Prospect profile deleted");
        setShowDeleteModal(null);
      } else {
        setToast(result.error || "Failed to delete profile");
      }
    } catch (err) {
      setToast("Failed to delete profile");
      console.error("Failed to delete profile:", err);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Prospects</h1>
        <div className="flex items-center gap-2">
          {/* Filter Toggle - Only show if there are unclaimed profiles */}
          {orphanedProfiles.length > 0 && (
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
            New Prospect
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {displayedProfiles.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
            No prospect profiles yet
          </h3>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            Create a prospect profile to manage unified branding across all demo
            types.
          </p>
          <div className="flex justify-center">
            <Button
              onClick={handleCreate}
              className="gap-1.5 bg-[#4779FF] hover:bg-[#3968e8] text-white text-xs"
            >
              <Plus className="w-4 h-4" />
              Create Prospect
            </Button>
          </div>
        </div>
      )}

      {/* Profiles Table */}
      {displayedProfiles.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_80px_80px_120px] border-b border-slate-100 bg-slate-50">
            <div className="px-4 py-2.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                Prospect
              </span>
            </div>
            <div className="px-4 py-2.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                Demos
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
            {displayedProfiles.map((profile) => (
              <div
                key={profile.id}
                className="grid grid-cols-[1fr_80px_80px_120px] hover:bg-slate-50 transition-colors cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/dashboard/prospects/${profile.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/dashboard/prospects/${profile.id}`);
                  }
                }}
              >
                {/* Prospect */}
                <div className="px-4 py-3 flex items-center gap-2.5">
                  <ProspectIcon
                    domain={profile.companyUrl}
                    name={profile.name}
                    size={36}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">
                      {profile.name}
                    </p>
                    {profile.companyUrl && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {displayHost(profile.companyUrl)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Demos Count */}
                <div className="px-4 py-3 flex items-center">
                  <span className="text-xs text-slate-500">
                    {Object.values(profile.demos).filter(Boolean).length}
                  </span>
                </div>

                {/* Updated */}
                <div className="px-4 py-3 flex items-center">
                  <span className="text-xs text-slate-500">
                    {new Date(profile.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 flex items-center justify-end gap-0.5">
                  <Tooltip content="Edit" position="top">
                    <Link
                      href={`/dashboard/prospects/${profile.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className={ICON_ACTION}
                      aria-label="Edit"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </Link>
                  </Tooltip>
                  <Tooltip content="Delete" position="top">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowDeleteModal({
                          id: profile.id,
                          name: profile.name,
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
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

      {/* Load More - only the "my" tab is paginated; "unclaimed" is a bounded, non-paginated fetch */}
      {filter === "my" && hasNextPage && (
        <div className="flex justify-center mt-4">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs"
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        onConfirm={handleDelete}
        title="Delete Prospect Profile"
        description={
          <>
            Are you sure you want to delete{" "}
            <span className="font-medium text-slate-900">
              &quot;{showDeleteModal?.name}&quot;
            </span>
            ? This will also delete all associated demo configs. This action
            cannot be undone.
          </>
        }
        confirmText="Delete"
        isLoading={isDeleting}
        variant="danger"
      />

      {/* Toast Notification */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <NewProspectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
