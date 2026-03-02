"use client";

import Image from "next/image";

interface UserAvatarProps {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  isLoading?: boolean;
  size?: "sm" | "md";
}

export function UserAvatar({
  displayName,
  email,
  avatarUrl,
  isLoading = false,
  size = "sm",
}: UserAvatarProps) {
  const avatarSize = size === "sm" ? 32 : 40;
  const avatarClass = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const gapClass = size === "sm" ? "gap-2" : "gap-3";

  if (isLoading) {
    return (
      <div className={`flex items-center ${gapClass}`}>
        <div
          className={`${avatarClass} rounded-full bg-gray-200 animate-pulse`}
        />
        <div className="text-left">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse mt-1" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${gapClass}`}>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={displayName}
          width={avatarSize}
          height={avatarSize}
          className="rounded-full"
        />
      ) : (
        <div
          className={`${avatarClass} rounded-full bg-earn-primary text-white flex items-center justify-center text-sm font-medium`}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="text-left">
        <div className="text-sm font-medium text-earn-text-primary">
          {displayName}
        </div>
        <div className="text-xs text-earn-text-secondary mt-0.5">
          {email}
        </div>
      </div>
    </div>
  );
}
