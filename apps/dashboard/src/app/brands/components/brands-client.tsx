"use client";

/**
 * Client-side Brands Dashboard Component
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
  Building2,
} from "lucide-react";
import type { BrandProfile } from "@/lib/types/dashboard";
import { deleteBrandProfile } from "@/lib/actions/brands";
import { Button } from "@dynamic-demos/ui";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Toast } from "@/app/checkouts/components/editor/toast";

interface BrandsClientProps {
  initialProfiles: BrandProfile[];
  orphanedProfiles: BrandProfile[];
  currentUserId?: string;
}

export function BrandsClient({
  initialProfiles,
  orphanedProfiles: initialOrphaned,
  currentUserId,
}: BrandsClientProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [orphanedProfiles, setOrphanedProfiles] = useState(initialOrphaned);
  const [filter, setFilter] = useState<"my" | "unclaimed">("my");
  const [showDeleteModal, setShowDeleteModal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Get filtered profiles based on current filter
  const displayedProfiles =
    filter === "my"
      ? profiles.filter(
          (p) => p.ownerId && currentUserId && p.ownerId === currentUserId
        )
      : orphanedProfiles
          .filter((p) => !p.ownerId)
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );

  function handleCreate() {
    router.push("/brands/new");
  }

  async function handleDelete() {
    if (!showDeleteModal || isDeleting) return;

    try {
      setIsDeleting(true);
      const result = await deleteBrandProfile(showDeleteModal.id);

      if (result.success) {
        setProfiles((prev) => prev.filter((p) => p.id !== showDeleteModal.id));
        setOrphanedProfiles((prev) =>
          prev.filter((p) => p.id !== showDeleteModal.id)
        );
        setToast("Brand profile deleted");
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
        <h1 className="text-xl font-semibold text-slate-900">Brands</h1>
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
            New Brand
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
            No brand profiles yet
          </h3>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            Create a brand profile to manage unified branding across all demo
            types.
          </p>
          <div className="flex justify-center">
            <Button
              onClick={handleCreate}
              className="gap-1.5 bg-[#4779FF] hover:bg-[#3968e8] text-white text-xs"
            >
              <Plus className="w-4 h-4" />
              Create Brand
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
                Brand
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
                onClick={() => router.push(`/brands/${profile.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/brands/${profile.id}`);
                  }
                }}
              >
                {/* Brand */}
                <div className="px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">
                      {profile.name}
                    </p>
                    {profile.companyUrl && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {profile.companyUrl}
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
                  <Link
                    href={`/brands/${profile.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                    title="Edit"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowDeleteModal({
                        id: profile.id,
                        name: profile.name,
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
        title="Delete Brand Profile"
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
    </div>
  );
}
