"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { WidgetCard, Button, Input } from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/ui/error-message";
import { useAddRecipient } from "@/hooks/use-recipients";
import type { NavigationReturn } from "@/hooks/use-navigation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

interface AddRecipientScreenProps {
  navigation: NavigationReturn;
  onSuccess?: () => void;
}

export function AddRecipientScreen({
  navigation,
  onSuccess,
}: AddRecipientScreenProps) {
  const [email, setEmail] = useState("");
  const addRecipient = useAddRecipient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !isValidEmail(trimmed)) return;

    try {
      await addRecipient.mutateAsync(trimmed);
      onSuccess?.();
      navigation.goToDashboard();
    } catch {
      // Error shown via addRecipient.error
    }
  };

  return (
    <WidgetCard
      icon={
        <UserPlus
          className="w-[18px] h-[18px] text-(--brand-fg)"
          strokeWidth={1.5}
        />
      }
      title="Add new contact"
      subtitle="Create a contact for this email address"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="recipient@example.com"
          autoComplete="email"
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={navigation.goToDashboard}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={!isValidEmail(email.trim()) || addRecipient.isPending}
            loading={addRecipient.isPending}
          >
            Add contact
          </Button>
        </div>
        <ErrorMessage error={addRecipient.error} />
      </form>
    </WidgetCard>
  );
}
