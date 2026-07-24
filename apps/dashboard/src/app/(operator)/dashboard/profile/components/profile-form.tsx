"use client";

/** Profile self-service form (Phase GTM-07). Edits displayName, avatarUrl,
 * schedulingUrl. The scheduling URL drives the book-a-call CTA rendered inside
 * live demos. Reference layout: SettingsSection + a bordered SECTION_CARD per
 * section, staged through the shared UnsavedChangesBar - never an inline
 * Save button. */

import { useState } from "react";
import { cn } from "@dynamic-demos/utils";

import { Input, Label, UnsavedChangesBar } from "@/components/droplet-client";
import { SettingsSection } from "@/components/settings-section";
import { SECTION_CARD } from "@/components/shared/section-card";
import { updateProfile } from "@/lib/actions/profile";
import { toastSuccess, toastError } from "@/lib/toast";
import { NO_AUTOFILL } from "@/lib/no-autofill";

export interface ProfileFormProps {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  schedulingUrl: string | null;
}

export function ProfileForm(props: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(props.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(props.avatarUrl ?? "");
  const [schedulingUrl, setSchedulingUrl] = useState(props.schedulingUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    displayName !== (props.displayName ?? "") ||
    avatarUrl !== (props.avatarUrl ?? "") ||
    schedulingUrl !== (props.schedulingUrl ?? "");

  function handleReset() {
    setDisplayName(props.displayName ?? "");
    setAvatarUrl(props.avatarUrl ?? "");
    setSchedulingUrl(props.schedulingUrl ?? "");
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await updateProfile({ displayName, avatarUrl, schedulingUrl });
      if (!result.success) {
        toastError(result.error || "Failed to save profile");
        return;
      }
      toastSuccess("Profile Saved");
    } catch (err) {
      toastError("Failed to save changes");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <SettingsSection
        title="Account"
        description="Your identity across the workspace and inside your live demos."
      >
        <div className={cn(SECTION_CARD, "space-y-5")}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={props.email} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              {...NO_AUTOFILL}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              {...NO_AUTOFILL}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Scheduling"
        description="The book-a-call link shown inside your live demos."
      >
        <div className={cn(SECTION_CARD, "space-y-1.5")}>
          <Label htmlFor="schedulingUrl">Scheduling URL</Label>
          <Input
            id="schedulingUrl"
            value={schedulingUrl}
            onChange={(e) => setSchedulingUrl(e.target.value)}
            placeholder="https://cal.com/you"
            {...NO_AUTOFILL}
          />
          <p className="text-xs text-muted-foreground">
            Drives the book-a-call CTA rendered inside your live demos. Must be
            an https link.
          </p>
        </div>
      </SettingsSection>

      <UnsavedChangesBar
        hasChanges={hasChanges && !isSaving}
        onSave={() => void handleSave()}
        onReset={handleReset}
        suppressed={isSaving}
      />
    </div>
  );
}
