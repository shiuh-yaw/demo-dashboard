"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/components/droplet-client";
import { createProspectProfile } from "@/lib/actions/prospects";
import { NO_AUTOFILL } from "@/lib/no-autofill";

/**
 * Create-prospect modal. Name + website only; branding (logo, colors) is
 * derived in the background from the website after create. Single create path
 * for the whole operator surface - the standalone /prospects/new page is gone.
 */

export interface NewProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewProspectDialog({ open, onOpenChange }: NewProspectDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Prospect name is required");
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const result = await createProspectProfile({
        name: name.trim(),
        companyUrl: companyUrl.trim() || undefined,
      });
      if (result.success) {
        onOpenChange(false);
        setName("");
        setCompanyUrl("");
        router.push(`/dashboard/prospects/${result.data.id}`);
      } else {
        setError(result.error || "Failed to create prospect");
      }
    } catch {
      setError("Failed to create prospect");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Prospect</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form
            id="new-prospect-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="prospect-name">Prospect name</Label>
              <Input
                id="prospect-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
                autoFocus
                {...NO_AUTOFILL}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prospect-url">Company website</Label>
              <Input
                id="prospect-url"
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                placeholder="https://acme.com"
                {...NO_AUTOFILL}
              />
              <p className="text-xs text-muted-foreground">
                We use the website to derive the logo and colors automatically.
                You can edit them afterwards.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-prospect-form"
            size="sm"
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create prospect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
