"use client";

import { User, Send } from "lucide-react";
import { Card, CardHeader, CardContent, Button } from "@dynamic-demos/ui";
import {
  getRecipientDisplayName,
  getRecipientInitials,
  type RecipientEntry,
} from "@/lib/recipients";

interface RecentRecipientsProps {
  recipients: RecipientEntry[];
  onAddRecipient?: () => void;
  /** Called when user clicks send icon - opens send modal with recipient pre-selected. */
  onSendToRecipient?: (recipient: RecipientEntry) => void;
}

const AVATAR_COLORS: string[] = [
  "bg-blue-500/20 text-blue-700",
  "bg-green-500/20 text-green-700",
  "bg-purple-500/20 text-purple-700",
  "bg-amber-500/20 text-amber-700",
  "bg-rose-500/20 text-rose-700",
];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]!;
}

export function RecentRecipients({
  recipients,
  onAddRecipient,
  onSendToRecipient,
}: RecentRecipientsProps) {
  return (
    <Card>
      <CardHeader
        className="px-4 pb-0 pt-5 sm:px-5"
        title="Recent contacts"
        action={
          onAddRecipient && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddRecipient}
              className="text-(--brand-primary) hover:text-(--brand-primary-hover)"
            >
              Add Contact
            </Button>
          )
        }
      />
      <CardContent className="p-0">
        {recipients.length === 0 ? (
          <div className="text-center px-4 py-8 sm:px-5">
            <div className="w-12 h-12 rounded-full bg-(--brand-row-bg) flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-(--brand-muted)" />
            </div>
            <p className="text-sm text-(--brand-muted)">No recipients yet</p>
            <p className="text-xs text-(--brand-muted)/60 mt-1">
              Send money to add recipients to your list
            </p>
            {onAddRecipient && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddRecipient}
                className="mt-3 text-(--brand-primary)"
              >
                Add
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-(--brand-border)">
            {recipients.map((recipient, index) => (
              <div
                key={recipient.email}
                className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
              >
                <div
                  className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${getAvatarColor(index)}`}
                >
                  {recipient.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external avatar URLs
                    <img
                      src={recipient.avatarUrl}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getRecipientInitials(recipient)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-(--brand-fg) truncate">
                    {getRecipientDisplayName(recipient)}
                  </p>
                  <p className="text-xs text-(--brand-muted) truncate">
                    {recipient.email}
                  </p>
                </div>
                {onSendToRecipient && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendToRecipient(recipient);
                    }}
                    className="shrink-0 p-2 rounded-lg cursor-pointer text-(--brand-muted) hover:text-(--brand-primary) hover:bg-(--brand-primary)/5 transition-colors"
                    aria-label={`Send to ${getRecipientDisplayName(recipient)}`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
