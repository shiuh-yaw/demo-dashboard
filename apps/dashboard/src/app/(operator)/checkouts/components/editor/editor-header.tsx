/**
 * Editor Header Component
 *
 * Displays the checkout name input, save button, and back navigation.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardButton } from "@/components/ui/dashboard-button";
import { updateCheckout } from "@/lib/actions/checkouts";

interface EditorHeaderProps {
  name: string;
  id: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isOrphaned?: boolean;
  onNameChange: (name: string) => void;
  onSave: () => void;
}

export function EditorHeader({
  name,
  id,
  hasUnsavedChanges,
  isSaving,
  isOrphaned,
  onNameChange,
  onSave,
}: EditorHeaderProps) {
  const router = useRouter();
  const [isClaiming, setIsClaiming] = useState(false);

  async function handleClaim() {
    if (isClaiming) return;

    try {
      setIsClaiming(true);
      // Claim by updating the checkout (this will associate it with the user)
      const result = await updateCheckout(id, { name });

      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || "Failed to claim checkout");
      }
    } catch (err) {
      console.error("Failed to claim checkout:", err);
      alert("Failed to claim checkout");
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <div className="flex items-center gap-3 mb-6">
      <Link
        href="/checkouts"
        className="p-2 text-[#525866] hover:text-[#0e121b] hover:bg-white rounded-lg transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="text-lg font-semibold text-[#0e121b] bg-transparent border-b border-transparent hover:border-[#e1e4ea] focus:border-[#335cff] outline-none w-full py-0.5 transition-colors truncate"
          placeholder="Checkout Name..."
          required
        />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {isOrphaned && (
          <DashboardButton
            onClick={handleClaim}
            disabled={isClaiming}
            variant="outline"
          >
            {isClaiming ? "Claiming..." : "Claim Checkout"}
          </DashboardButton>
        )}
        {hasUnsavedChanges && (
          <span className="text-xs text-[#f59e0b] flex items-center gap-1.5 bg-[#fef3c7] px-2 py-1 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
            Unsaved
          </span>
        )}
        <DashboardButton
          onClick={onSave}
          disabled={isSaving || !name.trim()}
          variant={hasUnsavedChanges ? "warning" : "primary"}
        >
          {isSaving ? "Saving..." : "Save"}
        </DashboardButton>
      </div>
    </div>
  );
}
