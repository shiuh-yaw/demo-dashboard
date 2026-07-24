import Link from "next/link";
import { BrandGateLayout } from "@/components/brand-gate-layout";
import { Button, Card } from "@/components/droplet-client";

/**
 * Access-denied page. Reached when a visitor holds a valid Dynamic session but
 * is not allowlisted (off-domain, deactivated) or lacks the required role.
 * Lives outside the (operator) group so its own render never re-triggers the
 * gate that redirected here. Shares `BrandGateLayout` with the auth and
 * welcome screens - no back link here, matching welcome. Uses droplet
 * primitives (not hand-rolled markup) so it themes via operator tokens
 * instead of hardcoding light-only slate/white colors.
 */
export default function DeniedPage() {
  return (
    <BrandGateLayout>
      <Card className="w-full max-w-md">
        <div className="flex flex-col items-center gap-5 p-6 text-center">
          <div className="space-y-2">
            <h1 className="text-lg font-semibold text-foreground">
              Access not available
            </h1>
            <p className="text-sm text-muted-foreground">
              Your account is signed in but does not have access to this
              workspace. Ask an owner or admin to grant you a role, then sign
              in again.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/">Back to demos</Link>
          </Button>
        </div>
      </Card>
    </BrandGateLayout>
  );
}
