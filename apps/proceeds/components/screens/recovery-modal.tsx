"use client";

import { UserPlus } from "lucide-react";
import { Button, Input } from "@dynamic-demos/ui";

export function RecoveryModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-(--brand-surface) rounded-(--brand-radius-lg) shadow-xl w-full max-w-md">
        <div className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-(--brand-primary)/10 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-5 h-5 text-(--brand-primary)" />
          </div>
          <h2 className="text-lg font-semibold text-(--brand-fg) mb-2">
            Recovery contact
          </h2>
          <p className="text-sm text-(--brand-muted) mb-6 leading-relaxed">
            Choose a trusted person to help you recover access to your
            stablecoins if you lose your device or account.
          </p>

          <div className="mb-4 text-left">
            <Input label="Contact's email" type="email" />
          </div>

          <Button className="w-full mb-2">Send invitation</Button>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}
