import Link from "next/link";
import { Home, Search } from "lucide-react";
import { BrandGateLayout } from "@/components/brand-gate-layout";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/droplet-client";

/**
 * Dashboard-side 404. Renders shell-less (no operator sidebar/top bar), so it
 * shares `BrandGateLayout` with the auth/denied/welcome gates instead of
 * hardcoding a light-only card. The (public) route group has its own
 * `not-found.tsx` for the marketing surface - not touched here.
 */
export default function DashboardNotFound() {
  return (
    <BrandGateLayout hideLogo>
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full gap-2">
            <Link href="/">
              <Home className="w-4 h-4" />
              Back to home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </BrandGateLayout>
  );
}
