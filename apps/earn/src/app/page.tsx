import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth/session";

export default async function HomePage() {
  const authenticated = await isAuthenticated();

  // Redirect authenticated users to dashboard, others to login
  if (authenticated) {
    redirect("/earn");
  } else {
    redirect("/login");
  }
}
