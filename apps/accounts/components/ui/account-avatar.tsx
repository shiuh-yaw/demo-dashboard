"use client";

import { useState } from "react";
import { cn } from "@dynamic-demos/utils";
import { initials } from "@/lib/business-accounts/view";
import { readAccountAvatar } from "@/lib/business-accounts/avatar";

/**
 * Account avatar: the uploaded image or the website's favicon, falling back to
 * the name's initials.
 *
 * A favicon is a third-party URL that can 404 or be blocked, so a load error
 * falls back to initials rather than leaving a broken image in the row.
 */
export function AccountAvatar({
  name,
  metadata,
  className,
}: {
  name?: string | null;
  /** `BusinessAccount.metadata` - typed `object`, read defensively. */
  metadata?: unknown;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const { src } = readAccountAvatar(metadata);

  const box = cn(
    "flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-(--brand-radius)",
    className,
  );

  if (src && !failed) {
    return (
      <span className={cn(box, "border border-(--brand-border) bg-white")}>
        <img
          src={src}
          alt=""
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        box,
        "bg-(--brand-primary) text-xs font-bold text-(--brand-primary-fg)",
      )}
    >
      {initials(name)}
    </span>
  );
}
