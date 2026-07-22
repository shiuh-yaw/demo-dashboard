"use client";

/**
 * Avatar + name/email block for the user menu (earn parity). Brand-token
 * styled; plain <img> for the OAuth photo (arbitrary Google hosts -
 * next/image would need remotePatterns for no real gain at 32px).
 */

interface UserAvatarProps {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  isLoading?: boolean;
  size?: "sm" | "md";
  /** Collapse to avatar-only below sm (header trigger on phones). */
  hideTextOnMobile?: boolean;
}

export function UserAvatar({
  displayName,
  email,
  avatarUrl,
  isLoading = false,
  size = "sm",
  hideTextOnMobile = false,
}: UserAvatarProps) {
  const avatarClass = size === "sm" ? "w-7 h-7" : "w-10 h-10";
  const gapClass = size === "sm" ? "gap-2" : "gap-3";
  const textClass = hideTextOnMobile
    ? "hidden text-left sm:block"
    : "text-left";

  if (isLoading) {
    return (
      <div className={`flex items-center ${gapClass}`}>
        <div
          className={`${avatarClass} rounded-full bg-(--brand-row-bg) animate-pulse`}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center ${gapClass}`}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external OAuth avatar hosts
        <img
          src={avatarUrl}
          alt={displayName}
          className={`${avatarClass} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${avatarClass} rounded-full bg-(--brand-primary) text-(--brand-primary-fg) flex items-center justify-center text-sm font-medium`}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className={textClass}>
        <div className="text-sm font-medium text-(--brand-fg)">
          {displayName}
        </div>
        {email && size === "md" && (
          <div className="text-xs text-(--brand-muted) mt-0.5">{email}</div>
        )}
      </div>
    </div>
  );
}
