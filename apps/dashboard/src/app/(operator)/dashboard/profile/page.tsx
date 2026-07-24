/** Profile (Phase GTM-07). Self-service edit of the signed-in user's identity. */

import { requireUser } from "@/lib/auth/gtm";
import { ProfileForm } from "./components/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How you appear across the workspace and inside your live demos.
        </p>
      </div>
      <ProfileForm
        email={user.email}
        displayName={user.displayName}
        avatarUrl={user.avatarUrl}
        schedulingUrl={user.schedulingUrl}
      />
    </div>
  );
}
